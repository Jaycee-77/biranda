const USERS = [
    {
        username: "admin",
        password: "admin123",
        role: "Admin"
    },
    {
        username: "staff",
        password: "staff123",
        role: "Staff"
    }
];

const STAFF_ALLOWED = [
    "reservations",
    "findReservation",
    "tableAvailability",
    "assignTable",
    "waitlist",
    "checkIn",
    "billSummary",
    "discounts",
    "payment",
    "receipts"
];

const packages = [
    {
        type: "Adult",
        price: 369
    },
    {
        type: "Kid",
        price: 269
    },
    {
        type: "Senior",
        price: 295
    }
];

const tables = [
    { number: 1, seats: 2, status: "available" },
    { number: 2, seats: 2, status: "available" },
    { number: 3, seats: 4, status: "available" },
    { number: 4, seats: 4, status: "available" },
    { number: 5, seats: 6, status: "available" },
    { number: 6, seats: 8, status: "available" },
    { number: 7, seats: 8, status: "available" },
    { number: 8, seats: 10, status: "available" },
    { number: 9, seats: 10, status: "available" },
    { number: 10, seats: 11, status: "available" }
];

let reservations = [];
let waitlist = [];
let activeWalkIns = [];
let transactions = [];

let currentUser = null;
let activeSection = "reservations";
let flashMsg = null;
let sortedView = null;
let lastReceipt = null;

let nextReservationId = 1;
let nextWaitlistId = 1;
let nextTransactionId = 1;

let currentOrder = {
    reservationName: "",
    adult: 0,
    kid: 0,
    senior: 0,
    isPWD: false,
    subtotal: 0,
    discount: 0,
    total: 0,
    sourceType: null,
    sourceId: null,
    tableNumber: null
};

const NAV = [
    {
        group: "Reservations",
        items: [
            ["reservations", "Reservations"],
            ["findReservation", "Find a Reservation"],
            ["cancelReservation", "Cancel a Reservation"],
            ["sortReservations", "Sort Reservations"]
        ]
    },
    {
        group: "Floor & Queue",
        items: [
            ["tableAvailability", "Table Availability"],
            ["assignTable", "Assign a Table"],
            ["waitlist", "Waitlist"],
            ["checkIn", "Check-In"]
        ]
    },
    {
        group: "Orders & Billing",
        items: [
            ["buffetPackages", "Buffet Packages"],
            ["guestCount", "Guest Count"],
            ["billSummary", "Bill Summary"],
            ["discounts", "Discounts"],
            ["payment", "Payment"],
            ["receipts", "Receipts"]
        ]
    },
    {
        group: "Reports",
        items: [
            ["dailyReport", "Daily Report"]
        ]
    }
];



function login() {
    const username =
        document.getElementById("loginUsername").value;

    const password =
        document.getElementById("loginPassword").value;

    const error =
        document.getElementById("loginError");

    if (!username) {
        error.textContent =
            "Please select Admin or Staff.";
        return;
    }

    if (!password) {
        error.textContent =
            "Please enter your password.";
        return;
    }

    let user = null;

    for (let i = 0; i < USERS.length; i++) {
        if (
            USERS[i].username === username &&
            USERS[i].password === password
        ) {
            user = USERS[i];
            break;
        }
    }

    if (!user) {
        error.textContent = "Incorrect password.";
        return;
    }

    currentUser = user;
    activeSection = "reservations";

    document.body.classList.remove("logged-out");

    document.getElementById("loginOverlay")
        .style.display = "none";

    document.getElementById("loggedUser")
        .textContent =
        user.username + " • " + user.role;

    render();
}

function logout() {
    currentUser = null;

    document.body.classList.add("logged-out");

    document.getElementById("loginOverlay")
        .style.display = "flex";

    document.getElementById("loginPassword")
        .value = "";

    document.getElementById("loginError")
        .textContent = "";
}



function go(id) {
    if (
        currentUser.role === "Staff" &&
        STAFF_ALLOWED.indexOf(id) === -1
    ) {
        return;
    }

    activeSection = id;
    render();
}



function setFlash(text, type = "ok") {
    flashMsg = {
        text: text,
        type: type
    };
}

function flash() {
    if (!flashMsg) {
        return "";
    }

    const message = `
        <div class="flash ${flashMsg.type === "err" ? "err" : ""}">
            ${flashMsg.text}
        </div>
    `;

    flashMsg = null;

    return message;
}

/* DATE */

function today() {
    const d = new Date();

    return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
    );
}

function validReservationDate(date, time) {
    if (!date || !time) {
        return false;
    }

    const chosen = new Date(date + "T" + time);
    const now = new Date();

    return !isNaN(chosen) && chosen >= now;
}

function setDateLimits() {
    const date = document.getElementById("rm-date");

    if (date) {
        date.min = today();
    }
}

/* CLOCK */

function tick() {
    const d = new Date();

    document.getElementById("clockDate")
        .textContent =
        d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric"
        });

    document.getElementById("clockTime")
        .textContent =
        d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
        });
}

setInterval(tick, 30000);

/* DASHBOARD STATS */

function renderStats() {
    let sales = 0;
    let guests = 0;
    const currentDate = today();

    for (let i = 0; i < transactions.length; i++) {
        if (transactions[i].date === currentDate) {
            sales += transactions[i].total;
            guests += transactions[i].guests;
        }
    }

    let booked = 0;

    for (let i = 0; i < reservations.length; i++) {
        if (
            reservations[i].date === currentDate &&
            reservations[i].status !== "cancelled"
        ) {
            booked += reservations[i].guests;
        }
    }

    document.getElementById("statstrip").innerHTML = `
        <div class="stat-chip">
            <b>${availableTableCount()}</b> tables free
        </div>

        <div class="stat-chip">
            <b>${waitlist.length}</b> waiting
        </div>

        <div class="stat-chip">
            <b>${booked}</b> guests booked today
        </div>

        <div class="stat-chip">
            <b>₱${sales.toLocaleString()}</b> today's sales
        </div>
    `;
}

function availableTableCount() {
    let count = 0;

    for (let i = 0; i < tables.length; i++) {
        if (tables[i].status === "available") {
            count++;
        }
    }

    return count;
}



function renderNav() {
    let html = "";

    for (let g = 0; g < NAV.length; g++) {
        const items = NAV[g].items;

        html += `
            <div class="navgroup">
                <h4>${NAV[g].group}</h4>
        `;

        for (let i = 0; i < items.length; i++) {
            if (
                currentUser.role === "Staff" &&
                STAFF_ALLOWED.indexOf(items[i][0]) === -1
            ) {
                continue;
            }

            html += `
                <button
                    class="navitem ${
                        activeSection === items[i][0]
                            ? "active"
                            : ""
                    }"
                    onclick="go('${items[i][0]}')"
                >
                    ${items[i][1]}
                </button>
            `;
        }

        html += "</div>";
    }

    document.getElementById("rail").innerHTML = html;
}

function head(title, desc) {
    return `
        <div class="head">
            <h1>${title}</h1>
            <p>${desc}</p>
        </div>
    `;
}



function reservationsTable(list, actions = false) {
    if (!list.length) {
        return `
            <p class="empty">
                No reservations yet.
            </p>
        `;
    }

    let rows = "";

    for (let i = 0; i < list.length; i++) {
        const r = list[i];

        rows += `
            <tr>
                <td>
                    RES-${String(r.id).padStart(3, "0")}
                </td>

                <td>${r.name}</td>

                <td>${r.contact || "—"}</td>

                <td>${r.date}</td>

                <td>${r.time}</td>

                <td>${r.adult}</td>

                <td>${r.kid}</td>

                <td>${r.senior}</td>

                <td>
                    <b>${r.guests}</b>
                </td>

                <td>
                    ${r.tableNumber
                        ? "#" + r.tableNumber
                        : "—"}
                </td>

                <td>
                    <span class="pill ${r.status}">
                        ${r.status}
                    </span>

                    ${
                        r.checkInTime
                            ? `<div class="hint">
                                ${r.checkInTime}
                               </div>`
                            : ""
                    }
                </td>

                ${
                    actions
                        ? `
                            <td class="actions">
                                ${
                                    r.status === "pending"
                                        ? `
                                            <button
                                                class="btn confirm small"
                                                onclick="quickCheckIn(${r.id})"
                                            >
                                                Check In
                                            </button>

                                            <button
                                                class="btn danger small"
                                                onclick="cancelReservationById(${r.id})"
                                            >
                                                Cancel
                                            </button>
                                        `
                                        : ""
                                }
                            </td>
                        `
                        : ""
                }
            </tr>
        `;
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Guest</th>
                    <th>Contact</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Adult</th>
                    <th>Kid</th>
                    <th>Senior</th>
                    <th>Total</th>
                    <th>Table</th>
                    <th>Status</th>
                    ${actions ? "<th>Action</th>" : ""}
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function renderReservations() {
    let options =
        '<option value="">No table selected (assign later)</option>';

    for (let i = 0; i < tables.length; i++) {
        options += `
            <option value="${tables[i].number}">
                Table ${tables[i].number}
                — ${tables[i].seats} seats
            </option>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Reservations",
                "Create a booking with Adult, Kid, and Senior counts."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>Guest name</label>
                    <input
                        id="rm-name"
                        placeholder="Juan Dela Cruz"
                    >
                </div>

                <div>
                    <label>Contact number</label>
                    <input
                        id="rm-contact"
                        placeholder="09xx-xxx-xxxx"
                    >
                </div>
            </div>

            <div class="row">
                <div>
                    <label>Date</label>
                    <input
                        id="rm-date"
                        type="date"
                        min="${today()}"
                    >
                </div>

                <div>
                    <label>Time</label>
                    <input
                        id="rm-time"
                        type="time"
                    >
                </div>

                <div>
                    <label>Table</label>
                    <select id="rm-table">
                        ${options}
                    </select>
                </div>
            </div>

            <div class="row">
                <div>
                    <label>Adult</label>
                    <input
                        id="rm-adult"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateReservationTotal()"
                    >
                </div>

                <div>
                    <label>Kid</label>
                    <input
                        id="rm-kid"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateReservationTotal()"
                    >
                </div>

                <div>
                    <label>Senior</label>
                    <input
                        id="rm-senior"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateReservationTotal()"
                    >
                </div>

                <div>
                    <label>Total Guests</label>
                    <input
                        id="rm-guests"
                        value="0"
                        readonly
                    >
                </div>
            </div>

            <button
                class="btn"
                onclick="addReservation()"
            >
                Save reservation
            </button>
        </div>

        <div class="card">
            <b>All reservations</b>

            <p class="hint">
                ${reservations.length} on the books.
            </p>

            ${reservationsTable(reservations)}
        </div>
    `;
}

function updateReservationTotal() {
    const adult =
        +document.getElementById("rm-adult").value || 0;

    const kid =
        +document.getElementById("rm-kid").value || 0;

    const senior =
        +document.getElementById("rm-senior").value || 0;

    document.getElementById("rm-guests").value =
        adult + kid + senior;
}

function conflict(table, date, time, ignore) {
    for (let i = 0; i < reservations.length; i++) {
        const r = reservations[i];

        if (
            r.id !== ignore &&
            r.status !== "cancelled" &&
            Number(r.tableNumber) === Number(table) &&
            r.date === date &&
            r.time === time
        ) {
            return true;
        }
    }

    return false;
}

function addReservation() {
    const name =
        document.getElementById("rm-name").value.trim();

    const contact =
        document.getElementById("rm-contact").value.trim();

    const date =
        document.getElementById("rm-date").value;

    const time =
        document.getElementById("rm-time").value;

    const adult = Math.max(
        0,
        +document.getElementById("rm-adult").value || 0
    );

    const kid = Math.max(
        0,
        +document.getElementById("rm-kid").value || 0
    );

    const senior = Math.max(
        0,
        +document.getElementById("rm-senior").value || 0
    );

    const guests =
        adult + kid + senior;

    const table =
        +document.getElementById("rm-table").value || null;

    if (!name || !contact || !date || !time) {
        setFlash(
            "Please complete all reservation fields.",
            "err"
        );

        render();
        return;
    }

    if (!validReservationDate(date, time)) {
        setFlash(
            "Reservation date and time must be today or a future schedule.",
            "err"
        );

        render();
        return;
    }

    if (guests < 1) {
        setFlash(
            "Enter at least 1 guest.",
            "err"
        );

        render();
        return;
    }

    if (table) {
        let selectedTable = null;

        for (let i = 0; i < tables.length; i++) {
            if (tables[i].number === table) {
                selectedTable = tables[i];
                break;
            }
        }

        if (!selectedTable) {
            setFlash(
                "Selected table does not exist.",
                "err"
            );

            render();
            return;
        }

        if (selectedTable.seats < guests) {
            setFlash(
                `Table ${table} can only seat ${selectedTable.seats} guests.`,
                "err"
            );

            render();
            return;
        }

        if (conflict(table, date, time, null)) {
            setFlash(
                `Table ${table} is already reserved for that schedule.`,
                "err"
            );

            render();
            return;
        }
    }

    reservations[reservations.length] = {
        id: nextReservationId++,
        name: name,
        contact: contact,
        date: date,
        time: time,
        guests: guests,
        adult: adult,
        kid: kid,
        senior: senior,
        tableNumber: table,
        status: "pending",
        checkInTime: null
    };

    if (table) {
        for (let i = 0; i < tables.length; i++) {
            if (tables[i].number === table) {
                tables[i].status = "reserved";
            }
        }
    }

    setFlash(
        `Reservation saved for ${name}.`
    );

    render();
}

/* FIND RESERVATION */

function renderFindReservation() {
    return `
        <div class="card">
            ${head(
                "Find a Reservation",
                "Search by reservation ID or guest name."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>
                        Name or reservation number
                    </label>

                    <input
                        id="rs-query"
                        placeholder="e.g. Juan or 3"
                    >
                </div>

                <div
                    style="display:flex;align-items:flex-end"
                >
                    <button
                        class="btn"
                        onclick="searchReservation()"
                    >
                        Search
                    </button>
                </div>
            </div>

            <div id="rs-result"></div>
        </div>
    `;
}

function searchReservation() {
    const q =
        document.getElementById("rs-query")
            .value
            .trim()
            .toLowerCase();

    let found = null;

    for (let i = 0; i < reservations.length; i++) {
        const r = reservations[i];

        const id = String(r.id);

        const full =
            "res-" +
            String(r.id).padStart(3, "0");

        if (
            id === q ||
            id.padStart(3, "0") === q ||
            full === q ||
            r.name.toLowerCase().includes(q)
        ) {
            found = r;
            break;
        }
    }

    document.getElementById("rs-result").innerHTML =
        !q
            ? '<p class="empty">Type a name or reservation number first.</p>'
            : found
                ? reservationsTable([found], true)
                : `<p class="empty">
                    No reservation matched "${q}".
                   </p>`;
}



function renderCancelReservation() {
    let list = [];

    for (let i = 0; i < reservations.length; i++) {
        if (reservations[i].status === "pending") {
            list[list.length] = reservations[i];
        }
    }

    if (!list.length) {
        return `
            <div class="card">
                ${head(
                    "Cancel a Reservation",
                    "There are no pending reservations to cancel."
                )}

                ${flash()}

                <p class="empty">
                    Nothing to cancel.
                </p>
            </div>
        `;
    }

    let options = "";

    for (let i = 0; i < list.length; i++) {
        options += `
            <option value="${list[i].id}">
                ${list[i].name}
                — ${list[i].date} ${list[i].time}
            </option>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Cancel a Reservation",
                "Cancel a booking and release its table."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>Reservation</label>

                    <select id="cx-res">
                        ${options}
                    </select>
                </div>

                <div
                    style="display:flex;align-items:flex-end"
                >
                    <button
                        class="btn danger"
                        onclick="cancelReservation()"
                    >
                        Cancel reservation
                    </button>
                </div>
            </div>
        </div>
    `;
}

function cancelReservation() {
    cancelReservationById(
        +document.getElementById("cx-res").value
    );
}

function cancelReservationById(id) {
    let index = -1;

    for (let i = 0; i < reservations.length; i++) {
        if (reservations[i].id === id) {
            index = i;
            break;
        }
    }

    if (index < 0) {
        return;
    }

    const r = reservations[index];

    if (!confirm(`Cancel reservation for ${r.name}?`)) {
        return;
    }

    if (r.tableNumber) {
        for (let i = 0; i < tables.length; i++) {
            if (tables[i].number === r.tableNumber) {
                tables[i].status = "available";
            }
        }
    }

    for (
        let i = index;
        i < reservations.length - 1;
        i++
    ) {
        reservations[i] = reservations[i + 1];
    }

    reservations.length--;

    setFlash(
        `Reservation for ${r.name} was cancelled.`
    );

    render();
}



function quickCheckIn(id) {
    checkInGuest(id);
}

let sortMode = "";

function renderSortReservations() {
    return `
        <div class="card">
            ${head(
                "Sort Reservations",
                "Arrange reservations by time or customer name."
            )}

            ${flash()}

            <div class="row">
                <button
                    class="btn"
                    onclick="doSort('time')"
                >
                    Sort by time
                </button>

                <button
                    class="btn secondary"
                    onclick="doSort('name')"
                >
                    Sort by name
                </button>
            </div>

            ${
                sortedView
                    ? reservationsTable(sortedView)
                    : '<p class="empty">Choose a sort order.</p>'
            }
        </div>
    `;
}

/* BUBBLE SORT */

function bubbleSort(a) {
    let x = [...a];

    for (let i = 0; i < x.length - 1; i++) {
        for (
            let j = 0;
            j < x.length - 1 - i;
            j++
        ) {
            if (
                (x[j].time || "") >
                (x[j + 1].time || "")
            ) {
                let temp = x[j];

                x[j] = x[j + 1];
                x[j + 1] = temp;
            }
        }
    }

    return x;
}



function selectionSort(a) {
    let x = [...a];

    for (let i = 0; i < x.length - 1; i++) {
        let min = i;

        for (let j = i + 1; j < x.length; j++) {
            if (
                x[j].name.toLowerCase() <
                x[min].name.toLowerCase()
            ) {
                min = j;
            }
        }

        if (min !== i) {
            let temp = x[i];

            x[i] = x[min];
            x[min] = temp;
        }
    }

    return x;
}

function doSort(type) {
    if (type === "time") {
        sortedView = bubbleSort(reservations);
    } else {
        sortedView = selectionSort(reservations);
    }

    sortMode = type;
    render();
}



function renderTableAvailability() {
    let total = 0;
    let available = 0;
    let occupied = 0;
    let seats = 0;
    let reserved = 0;

    for (let i = 0; i < tables.length; i++) {
        const t = tables[i];

        total++;

        if (t.status === "occupied") {
            occupied++;
        } else if (t.status === "reserved") {
            reserved++;
        } else {
            available++;
            seats += t.seats;
        }
    }

    let rows = "";

    for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        let r = null;

        for (let j = 0; j < reservations.length; j++) {
            if (
                reservations[j].tableNumber ===
                    t.number &&
                reservations[j].status !==
                    "cancelled"
            ) {
                r = reservations[j];

                if (r.status === "arrived") {
                    break;
                }
            }
        }

        rows += `
            <tr>
                <td>Table ${t.number}</td>
                <td>${t.seats}</td>
                <td>${t.status}</td>
                <td>${r ? r.date : "—"}</td>
                <td>${r ? r.time : "—"}</td>
            </tr>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Table Availability",
                "Count available and occupied tables using linear traversal."
            )}

            ${flash()}

            <div class="summary-grid">
                <div class="stat">
                    <span class="num">${total}</span>
                    <span class="lbl">Total tables</span>
                </div>

                <div class="stat">
                    <span class="num">${available}</span>
                    <span class="lbl">Available tables</span>
                </div>

                <div class="stat">
                    <span class="num">${occupied}</span>
                    <span class="lbl">Occupied tables</span>
                </div>

                <div class="stat">
                    <span class="num">${seats}</span>
                    <span class="lbl">Available seats</span>
                </div>
            </div>

            <p class="hint">
                Reserved tables: <b>${reserved}</b>
            </p>

            <table>
                <thead>
                    <tr>
                        <th>Table</th>
                        <th>Seats</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Time</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}



function renderAssignTable() {
    let pending = [];

    for (let i = 0; i < reservations.length; i++) {
        if (
            reservations[i].status === "pending" &&
            !reservations[i].tableNumber
        ) {
            pending[pending.length] = reservations[i];
        }
    }

    if (!pending.length) {
        return `
            <div class="card">
                ${head(
                    "Assign a Table",
                    "Assign the first available table that fits the party."
                )}

                ${flash()}

                <p class="empty">
                    No unassigned reservations right now.
                </p>
            </div>
        `;
    }

    let options = "";

    for (let i = 0; i < pending.length; i++) {
        options += `
            <option value="${pending[i].id}">
                ${pending[i].name}
                (${pending[i].guests} guests)
            </option>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Assign a Table",
                "Find the first available table with enough seats."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>Reservation</label>

                    <select id="ta-res">
                        ${options}
                    </select>
                </div>

                <div
                    style="display:flex;align-items:flex-end"
                >
                    <button
                        class="btn"
                        onclick="assignTable()"
                    >
                        Find &amp; assign table
                    </button>
                </div>
            </div>
        </div>
    `;
}

function assignTable() {
    const id =
        +document.getElementById("ta-res").value;

    let res = null;

    /* Linear Search */

    for (let i = 0; i < reservations.length; i++) {
        if (reservations[i].id === id) {
            res = reservations[i];
            break;
        }
    }

    if (!res) {
        return;
    }

    /* First Fit */

    for (let i = 0; i < tables.length; i++) {
        const t = tables[i];

        if (
            t.status === "available" &&
            t.seats >= res.guests
        ) {
            if (
                conflict(
                    t.number,
                    res.date,
                    res.time,
                    res.id
                )
            ) {
                continue;
            }

            t.status = "reserved";
            res.tableNumber = t.number;

            setFlash(
                `Table ${t.number} assigned to ${res.name}.`
            );

            render();
            return;
        }
    }

    setFlash(
        "No open table can fit that party size right now.",
        "err"
    );

    render();
}

/* WAITLIST */

function renderWaitlist() {
    let rows = "";

    for (let i = 0; i < waitlist.length; i++) {
        const w = waitlist[i];

        rows += `
            <div class="ticket">
                <span class="pos">
                    ${i + 1}
                </span>

                <span class="name">
                    ${w.name}
                </span>

                <span class="size">
                    Adult ${w.adult}
                    • Kid ${w.kid}
                    • Senior ${w.senior}
                    • Total ${w.size}
                </span>

                ${
                    i === 0
                        ? `
                            <button
                                class="btn confirm small"
                                onclick="serveNextWalkIn()"
                            >
                                Check / Seat
                            </button>
                          `
                        : `
                            <button
                                class="btn secondary small"
                                disabled
                            >
                                Waiting
                            </button>
                          `
                }
            </div>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Waitlist",
                "Walk-ins are seated immediately when possible, otherwise FIFO waitlist is used."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>Name</label>
                    <input
                        id="wl-name"
                        placeholder="Walk-in guest"
                    >
                </div>

                <div>
                    <label>Adult</label>
                    <input
                        id="wl-adult"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateWalkInTotal()"
                    >
                </div>

                <div>
                    <label>Kid</label>
                    <input
                        id="wl-kid"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateWalkInTotal()"
                    >
                </div>

                <div>
                    <label>Senior</label>
                    <input
                        id="wl-senior"
                        type="number"
                        min="0"
                        value="0"
                        oninput="updateWalkInTotal()"
                    >
                </div>

                <div>
                    <label>Total</label>
                    <input
                        id="wl-total"
                        value="0"
                        readonly
                    >
                </div>

                <div
                    style="display:flex;align-items:flex-end"
                >
                    <button
                        class="btn"
                        onclick="addWalkIn()"
                    >
                        Seat / Add Walk-In
                    </button>
                </div>
            </div>

            ${rows || `
                <p class="empty">
                    Nobody is waiting.
                </p>
            `}
        </div>
    `;
}

function updateWalkInTotal() {
    const adult =
        +document.getElementById("wl-adult").value || 0;

    const kid =
        +document.getElementById("wl-kid").value || 0;

    const senior =
        +document.getElementById("wl-senior").value || 0;

    document.getElementById("wl-total").value =
        adult + kid + senior;
}

function addWalkIn() {
    const name =
        document.getElementById("wl-name")
            .value
            .trim();

    const adult = Math.max(
        0,
        +document.getElementById("wl-adult").value || 0
    );

    const kid = Math.max(
        0,
        +document.getElementById("wl-kid").value || 0
    );

    const senior = Math.max(
        0,
        +document.getElementById("wl-senior").value || 0
    );

    const size =
        adult + kid + senior;

    if (!name || size < 1) {
        setFlash(
            "Enter a name and at least 1 guest.",
            "err"
        );

        render();
        return;
    }

    let chosen = null;

    for (let i = 0; i < tables.length; i++) {
        if (
            tables[i].status === "available" &&
            tables[i].seats >= size
        ) {
            chosen = tables[i];
            break;
        }
    }

    const w = {
        id: nextWaitlistId++,
        name: name,
        adult: adult,
        kid: kid,
        senior: senior,
        size: size,
        status: "waiting",
        tableNumber: null,
        checkInTime: null
    };

    if (chosen) {
        chosen.status = "occupied";

        w.status = "seated";
        w.tableNumber = chosen.number;
        w.checkInTime =
            new Date().toLocaleString();

        activeWalkIns[
            activeWalkIns.length
        ] = w;

        setFlash(
            `${name} is seated at Table ${chosen.number}.`
        );
    } else {
        waitlist[
            waitlist.length
        ] = w;

        setFlash(
            `${name} was added to the waitlist.`
        );
    }

    render();
}

function serveNextWalkIn() {
    if (!waitlist.length) {
        setFlash(
            "Nobody is waiting.",
            "err"
        );

        render();
        return;
    }

    const w = waitlist[0];
    let chosen = null;

    for (let i = 0; i < tables.length; i++) {
        if (
            tables[i].status === "available" &&
            tables[i].seats >= w.size
        ) {
            chosen = tables[i];
            break;
        }
    }

    if (!chosen) {
        setFlash(
            `No available table can fit ${w.name} yet.`,
            "err"
        );

        render();
        return;
    }

    for (
        let i = 0;
        i < waitlist.length - 1;
        i++
    ) {
        waitlist[i] = waitlist[i + 1];
    }

    waitlist.length--;

    chosen.status = "occupied";

    w.status = "seated";
    w.tableNumber = chosen.number;
    w.checkInTime =
        new Date().toLocaleString();

    activeWalkIns[
        activeWalkIns.length
    ] = w;

    setFlash(
        `${w.name} is seated at Table ${chosen.number}.`
    );

    render();
}



function renderCheckIn() {
    let list = [];

    for (let i = 0; i < reservations.length; i++) {
        if (
            reservations[i].status === "pending" &&
            reservations[i].tableNumber
        ) {
            list[list.length] = reservations[i];
        }
    }

    let options = "";

    for (let i = 0; i < list.length; i++) {
        options += `
            <option value="${list[i].id}">
                ${list[i].name}
                — Table ${list[i].tableNumber}
                — ${list[i].guests} guests
            </option>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Check-In",
                "Record the arrival time of a reserved customer."
            )}

            ${flash()}

            ${
                options
                    ? `
                        <div class="row">
                            <div>
                                <label>Reservation</label>

                                <select id="ci-res">
                                    ${options}
                                </select>
                            </div>

                            <div
                                style="display:flex;align-items:flex-end"
                            >
                                <button
                                    class="btn confirm"
                                    onclick="checkInGuest()"
                                >
                                    Check In / Seat
                                </button>
                            </div>
                        </div>
                      `
                    : `
                        <p class="empty">
                            No reserved customers are waiting for check-in.
                        </p>
                      `
            }
        </div>
    `;
}

function checkInGuest(id) {
    id =
        id ||
        +document.getElementById("ci-res").value;

    let r = null;

    for (let i = 0; i < reservations.length; i++) {
        if (reservations[i].id === id) {
            r = reservations[i];
            break;
        }
    }

    if (!r) {
        return;
    }

    const now = new Date();
    const todayDate = today();
    const nowTime =
        now.toTimeString().slice(0, 5);

    if (r.date !== todayDate) {
        setFlash(
            r.date > todayDate
                ? "This reservation is not scheduled for today yet."
                : "This reservation date has already passed.",
            "err"
        );

        render();
        return;
    }

    if (r.time > nowTime) {
        setFlash(
            "The reservation time has not arrived yet.",
            "err"
        );

        render();
        return;
    }

    r.status = "arrived";

    r.checkInTime =
        now.toLocaleString();

    if (r.tableNumber) {
        for (let i = 0; i < tables.length; i++) {
            if (
                tables[i].number ===
                r.tableNumber
            ) {
                tables[i].status =
                    "occupied";
            }
        }
    }

    setFlash(
        `${r.name} checked in and is seated at Table ${r.tableNumber}.`
    );

    render();
}

/* BILLING SESSIONS */

function sessions() {
    let list = [];

    for (let i = 0; i < reservations.length; i++) {
        const r = reservations[i];

        if (
            r.status === "arrived" &&
            r.tableNumber
        ) {
            list[list.length] = {
                type: "reservation",
                id: r.id,
                name: r.name,
                tableNumber: r.tableNumber,
                adult: r.adult,
                kid: r.kid,
                senior: r.senior,
                guests: r.guests
            };
        }
    }

    for (let i = 0; i < activeWalkIns.length; i++) {
        const w = activeWalkIns[i];

        if (w.status === "seated") {
            list[list.length] = {
                type: "walkin",
                id: w.id,
                name: w.name,
                tableNumber: w.tableNumber,
                adult: w.adult,
                kid: w.kid,
                senior: w.senior,
                guests: w.size
            };
        }
    }

    return list;
}

function sessionOptions() {
    const list = sessions();

    let options =
        '<option value="">Select customer / table to bill</option>';

    for (let i = 0; i < list.length; i++) {
        options += `
            <option value="${list[i].type}:${list[i].id}">
                ${list[i].name}
                — Table ${list[i].tableNumber}
                — ${list[i].guests} guests
            </option>
        `;
    }

    return options;
}

function loadBillingSession() {
    const value =
        document.getElementById(
            "billing-session"
        ).value;

    if (!value) {
        setFlash(
            "Select a customer or table first.",
            "err"
        );

        render();
        return;
    }

    const parts = value.split(":");
    const list = sessions();

    let selected = null;

    for (let i = 0; i < list.length; i++) {
        if (
            list[i].type === parts[0] &&
            list[i].id === +parts[1]
        ) {
            selected = list[i];
            break;
        }
    }

    if (!selected) {
        setFlash(
            "That dining session is no longer active.",
            "err"
        );

        render();
        return;
    }

    currentOrder = {
        ...currentOrder,
        reservationName: selected.name,
        adult: selected.adult,
        kid: selected.kid,
        senior: selected.senior,
        sourceType: selected.type,
        sourceId: selected.id,
        tableNumber: selected.tableNumber,
        discount: 0,
        total: 0
    };

    setFlash(
        `${selected.name} selected for billing.`
    );

    render();
}

/* BUFFET PACKAGES */

function renderBuffetPackages() {
    return `
        <div class="card">
            ${head(
                "Buffet Packages",
                "Select a checked-in customer and review package quantities."
            )}

            ${flash()}

            <div class="session">
                <label>Customer / Table</label>

                <select id="billing-session">
                    ${sessionOptions()}
                </select>

                <button
                    class="btn"
                    style="margin-top:10px"
                    onclick="loadBillingSession()"
                >
                    Load Customer
                </button>
            </div>

            ${
                currentOrder.sourceId
                    ? `
                        <p>
                            <b>
                                ${currentOrder.reservationName}
                            </b>
                            —
                            Table ${currentOrder.tableNumber}
                        </p>
                      `
                    : `
                        <p class="empty">
                            Select a customer first.
                        </p>
                      `
            }

            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Price</th>
                        <th>Qty</th>
                    </tr>
                </thead>

                <tbody>
                    ${packages.map(p => `
                        <tr>
                            <td>${p.type}</td>
                            <td>₱${p.price}</td>

                            <td>
                                <input
                                    id="bp-${p.type.toLowerCase()}"
                                    type="number"
                                    min="0"
                                    value="${
                                        currentOrder[
                                            p.type.toLowerCase()
                                        ]
                                    }"
                                    ${
                                        currentOrder.sourceId
                                            ? ""
                                            : "disabled"
                                    }
                                >
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <button
                class="btn"
                style="margin-top:14px"
                onclick="savePackages()"
                ${
                    currentOrder.sourceId
                        ? ""
                        : "disabled"
                }
            >
                Save selection
            </button>
        </div>
    `;
}

function savePackages() {
    if (!currentOrder.sourceId) {
        setFlash(
            "Select a customer first.",
            "err"
        );

        render();
        return;
    }

    currentOrder.adult =
        +document.getElementById(
            "bp-adult"
        ).value || 0;

    currentOrder.kid =
        +document.getElementById(
            "bp-kid"
        ).value || 0;

    currentOrder.senior =
        +document.getElementById(
            "bp-senior"
        ).value || 0;

    setFlash(
        "Package selection saved."
    );

    render();
}

/* BILLING */

function computeSubtotal() {
    let total = 0;

    packages.forEach(p => {
        total +=
            (
                currentOrder[
                    p.type.toLowerCase()
                ] || 0
            ) * p.price;
    });

    return total;
}

function renderGuestCount() {
    const total =
        currentOrder.adult +
        currentOrder.kid +
        currentOrder.senior;

    return `
        <div class="card">
            ${head(
                "Guest Count",
                "Current guest classification."
            )}

            ${flash()}

            <div class="summary-grid">
                <div class="stat">
                    <span class="num">
                        ${currentOrder.adult}
                    </span>

                    <span class="lbl">
                        Adults
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ${currentOrder.kid}
                    </span>

                    <span class="lbl">
                        Kids
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ${currentOrder.senior}
                    </span>

                    <span class="lbl">
                        Seniors
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ${total}
                    </span>

                    <span class="lbl">
                        Total
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderBillSummary() {
    const sub = computeSubtotal();

    currentOrder.subtotal = sub;

    return `
        <div class="card">
            ${head(
                "Bill Summary",
                "Select the customer and review the calculated bill."
            )}

            ${flash()}

            <div class="session">
                <label>Who will be billed?</label>

                <select id="billing-session">
                    ${sessionOptions()}
                </select>

                <button
                    class="btn"
                    style="margin-top:10px"
                    onclick="loadBillingSession()"
                >
                    Load Customer
                </button>
            </div>

            ${
                currentOrder.sourceId
                    ? `
                        <p>
                            <b>
                                ${currentOrder.reservationName}
                            </b>
                            —
                            Table ${currentOrder.tableNumber}
                            —
                            Adult ${currentOrder.adult},
                            Kid ${currentOrder.kid},
                            Senior ${currentOrder.senior}
                        </p>
                      `
                    : `
                        <p class="empty">
                            No customer selected.
                        </p>
                      `
            }

            <table>
                <thead>
                    <tr>
                        <th>Package</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${packages.map(p => {
                        const q =
                            currentOrder[
                                p.type.toLowerCase()
                            ] || 0;

                        return `
                            <tr>
                                <td>${p.type}</td>
                                <td>${q}</td>
                                <td>₱${p.price}</td>
                                <td>₱${q * p.price}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>

            <div
                class="stat"
                style="margin-top:16px;max-width:260px"
            >
                <span class="num">
                    ₱${sub.toLocaleString()}
                </span>

                <span class="lbl">
                    Subtotal
                </span>
            </div>
        </div>
    `;
}



function renderDiscounts() {
    const sub = computeSubtotal();

    const seniorTotal =
        currentOrder.senior * 295;

    const pwd =
        currentOrder.isPWD
            ? sub * 0.2
            : 0;

    return `
        <div class="card">
            ${head(
                "Discounts",
                "Apply a senior citizen or PWD discount before payment."
            )}

            ${flash()}

            <div class="checkbox-line">
                <input
                    type="checkbox"
                    id="dc-pwd"
                    ${
                        currentOrder.isPWD
                            ? "checked"
                            : ""
                    }
                >

                <label for="dc-pwd">
                    Guest has a PWD ID
                    (extra 20% off subtotal)
                </label>
            </div>

            <button
                class="btn"
                onclick="applyDiscount()"
            >
                Recalculate discount
            </button>

            <table style="margin-top:18px">
                <tbody>
                    <tr>
                        <td>Subtotal</td>
                        <td class="mono">
                            ₱${sub.toLocaleString()}
                        </td>
                    </tr>

                    <tr>
                        <td>
                            Senior discount
                            (20% of senior packages)
                        </td>

                        <td class="mono">
                            −₱${(
                                seniorTotal * 0.2
                            ).toLocaleString()}
                        </td>
                    </tr>

                    <tr>
                        <td>
                            PWD discount
                            (20% of subtotal)
                        </td>

                        <td class="mono">
                            −₱${pwd.toLocaleString()}
                        </td>
                    </tr>

                    <tr>
                        <td>
                            <strong>
                                Total discount
                            </strong>
                        </td>

                        <td class="mono">
                            <strong>
                                −₱${currentOrder.discount.toLocaleString()}
                            </strong>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

function applyDiscount() {
    const sub = computeSubtotal();

    const seniorTotal =
        currentOrder.senior * 295;

    currentOrder.isPWD =
        document.getElementById(
            "dc-pwd"
        ).checked;

    currentOrder.discount =
        (currentOrder.senior
            ? seniorTotal * 0.2
            : 0) +
        (
            currentOrder.isPWD
                ? sub * 0.2
                : 0
        );

    currentOrder.total =
        Math.max(
            sub - currentOrder.discount,
            0
        );

    setFlash(
        "Discount recalculated."
    );

    render();
}



function receiptHtml(t) {
    return `
        <div class="receipt">
            <div class="receipt-head">
                <div class="rname">
                    Veranda
                </div>

                <div class="rsub">
                    Resto Garden &amp;
                    Events Place
                </div>
            </div>

            <hr>

            <div class="receipt-line">
                <span>${t.name}</span>
                <span>${t.time}</span>
            </div>

            <div class="receipt-line">
                <span>Transaction</span>
                <span>${t.transactionId}</span>
            </div>

            <div class="receipt-line">
                <span>Table</span>
                <span>
                    ${
                        t.tableNumber
                            ? "Table " +
                              t.tableNumber
                            : "—"
                    }
                </span>
            </div>

            <div class="receipt-line">
                <span>Guests</span>
                <span>${t.guests}</span>
            </div>

            <hr>

            <div class="receipt-line">
                <span>
                    Adult x${t.adultQty}
                </span>

                <span>
                    ₱${(
                        t.adultQty * 369
                    ).toLocaleString()}
                </span>
            </div>

            <div class="receipt-line">
                <span>
                    Kid x${t.kidQty}
                </span>

                <span>
                    ₱${(
                        t.kidQty * 269
                    ).toLocaleString()}
                </span>
            </div>

            <div class="receipt-line">
                <span>
                    Senior x${t.seniorQty}
                </span>

                <span>
                    ₱${(
                        t.seniorQty * 295
                    ).toLocaleString()}
                </span>
            </div>

            <hr>

            <div class="receipt-line">
                <span>Subtotal</span>
                <span>
                    ₱${t.subtotal.toLocaleString()}
                </span>
            </div>

            <div class="receipt-line">
                <span>Discount</span>
                <span>
                    −₱${t.discount.toLocaleString()}
                </span>
            </div>

            <div class="receipt-line">
                <b>Total</b>
                <b>
                    ₱${t.total.toLocaleString()}
                </b>
            </div>

            <div class="receipt-line">
                <span>Tendered</span>
                <span>
                    ₱${t.tendered.toLocaleString()}
                </span>
            </div>

            <div class="receipt-line">
                <span>Change</span>
                <span>
                    ₱${t.change.toLocaleString()}
                </span>
            </div>

            <hr>

            <div class="receipt-foot">
                Paid • Salamat po sa pagbisita!
            </div>
        </div>
    `;
}



function renderPayment() {
    const total =
        currentOrder.total ||
        computeSubtotal();

    return `
        <div class="card">
            ${head(
                "Payment",
                "Take the amount tendered and settle the bill."
            )}

            ${flash()}

            ${
                currentOrder.sourceId
                    ? `
                        <div class="session">
                            <b>
                                ${currentOrder.reservationName}
                            </b>
                            —
                            Table ${currentOrder.tableNumber}
                            —
                            ${currentOrder.adult}
                            Adult,
                            ${currentOrder.kid}
                            Kid,
                            ${currentOrder.senior}
                            Senior
                        </div>
                      `
                    : `
                        <p class="empty">
                            Select and load a customer
                            from Bill Summary first.
                        </p>
                      `
            }

            <div
                class="stat"
                style="max-width:260px"
            >
                <span class="num">
                    ₱${total.toLocaleString()}
                </span>

                <span class="lbl">
                    Amount due
                </span>
            </div>

            <div class="row">
                <div>
                    <label>
                        Amount tendered
                    </label>

                    <input
                        id="pp-cash"
                        type="number"
                        min="0"
                        placeholder="0"
                    >
                </div>

                <div
                    style="display:flex;align-items:flex-end"
                >
                    <button
                        class="btn"
                        onclick="processPayment()"
                        ${
                            currentOrder.sourceId
                                ? ""
                                : "disabled"
                        }
                    >
                        Process payment
                    </button>
                </div>
            </div>

            ${
                lastReceipt
                    ? receiptHtml(lastReceipt)
                    : ""
            }
        </div>
    `;
}

/* PAYMENT PROCESSING */

function processPayment() {
    if (!currentOrder.sourceId) {
        setFlash(
            "Select a customer/table before payment.",
            "err"
        );

        render();
        return;
    }

    const cash =
        +document.getElementById(
            "pp-cash"
        ).value || 0;

    const sub =
        computeSubtotal();

    const total =
        currentOrder.total ||
        Math.max(
            sub -
            (currentOrder.discount || 0),
            0
        );

    const change =
        cash - total;

    if (change < 0) {
        setFlash(
            `Insufficient payment. Short by ₱${Math.abs(change).toLocaleString()}.`,
            "err"
        );

        render();
        return;
    }

    const now = new Date();

    const record = {
        id: nextTransactionId++,

        transactionId:
            "TXN-" +
            String(
                nextTransactionId - 1
            ).padStart(3, "0"),

        reservationId:
            currentOrder.sourceType ===
            "reservation"
                ? currentOrder.sourceId
                : null,

        walkInId:
            currentOrder.sourceType ===
            "walkin"
                ? currentOrder.sourceId
                : null,

        name:
            currentOrder.reservationName,

        tableNumber:
            currentOrder.tableNumber,

        guests:
            currentOrder.adult +
            currentOrder.kid +
            currentOrder.senior,

        adultQty:
            currentOrder.adult,

        kidQty:
            currentOrder.kid,

        seniorQty:
            currentOrder.senior,

        subtotal: sub,

        discount:
            currentOrder.discount || 0,

        total: total,

        tendered: cash,

        change: change,

        paymentStatus: "Paid",

        date: today(),

        time:
            now.toLocaleTimeString(),

        completedAt:
            now.toLocaleString()
    };

    transactions[
        transactions.length
    ] = record;

    lastReceipt = record;

    if (
        currentOrder.sourceType ===
        "reservation"
    ) {
        for (
            let i = 0;
            i < reservations.length;
            i++
        ) {
            if (
                reservations[i].id ===
                currentOrder.sourceId
            ) {
                reservations[i].status =
                    "completed";
                break;
            }
        }
    } else {
        for (
            let i = 0;
            i < activeWalkIns.length;
            i++
        ) {
            if (
                activeWalkIns[i].id ===
                currentOrder.sourceId
            ) {
                activeWalkIns[i].status =
                    "completed";
                break;
            }
        }
    }

    if (currentOrder.tableNumber) {
        for (
            let i = 0;
            i < tables.length;
            i++
        ) {
            if (
                tables[i].number ===
                currentOrder.tableNumber
            ) {
                tables[i].status =
                    "available";
            }
        }
    }

    setFlash(
        `Payment completed for ${record.name}. Transaction ${record.transactionId} saved.`
    );

    currentOrder = {
        reservationName: "",
        adult: 0,
        kid: 0,
        senior: 0,
        isPWD: false,
        subtotal: 0,
        discount: 0,
        total: 0,
        sourceType: null,
        sourceId: null,
        tableNumber: null
    };

    render();
}



function transactionTable(list) {
    if (!list.length) {
        return `
            <p class="empty">
                No completed transactions found.
            </p>
        `;
    }

    let rows = "";

    for (let i = 0; i < list.length; i++) {
        const t = list[i];

        rows += `
            <tr>
                <td>${t.transactionId}</td>
                <td>${t.name}</td>

                <td>
                    ${
                        t.tableNumber
                            ? "Table " +
                              t.tableNumber
                            : "—"
                    }
                </td>

                <td>${t.guests}</td>

                <td>
                    ₱${t.total.toLocaleString()}
                </td>

                <td>${t.paymentStatus}</td>

                <td>${t.date}</td>

                <td>${t.time}</td>
            </tr>
        `;
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Table</th>
                    <th>Guests</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Time</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function renderReceipts() {
    let list = [...transactions];

    list.reverse();

    let options =
        '<option value="">Select a receipt</option>';

    for (let i = 0; i < list.length; i++) {
        options += `
            <option value="${list[i].transactionId}">
                ${list[i].transactionId}
                - ${list[i].name}
            </option>
        `;
    }

    return `
        <div class="card">
            ${head(
                "Receipts",
                "Search and print completed customer receipts."
            )}

            ${flash()}

            <div class="row">
                <div>
                    <label>
                        Transaction ID or Customer Name
                    </label>

                    <input
                        id="tx-query"
                        oninput="searchTransactions()"
                        placeholder="e.g. TXN-001 or Juan"
                    >
                </div>

                <div>
                    <label>
                        Select Receipt
                    </label>

                    <select
                        id="receipt-select"
                        onchange="showReceipt()"
                    >
                        ${options}
                    </select>
                </div>
            </div>

            <div id="tx-results">
                ${transactionTable(list)}
            </div>

            <div id="receipt-preview"></div>
        </div>
    `;
}

function searchTransactions() {
    const q =
        (
            document.getElementById(
                "tx-query"
            ).value || ""
        )
            .trim()
            .toLowerCase();

    let list = [];

    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];

        if (
            !q ||
            t.transactionId
                .toLowerCase()
                .includes(q) ||
            t.name
                .toLowerCase()
                .includes(q)
        ) {
            list[list.length] = t;
        }
    }

    list.reverse();

    const select =
        document.getElementById(
            "receipt-select"
        );

    const old =
        select
            ? select.value
            : "";

    let options =
        '<option value="">Select a receipt</option>';

    for (let i = 0; i < list.length; i++) {
        options += `
            <option value="${list[i].transactionId}">
                ${list[i].transactionId}
                - ${list[i].name}
            </option>
        `;
    }

    if (select) {
        select.innerHTML = options;
        select.value = old;
    }

    document.getElementById(
        "tx-results"
    ).innerHTML =
        transactionTable(list);

    showReceipt();
}

function showReceipt() {
    const id =
        document.getElementById(
            "receipt-select"
        ).value;

    const box =
        document.getElementById(
            "receipt-preview"
        );

    if (!id) {
        box.innerHTML = "";
        return;
    }

    let transaction = null;

    for (
        let i = 0;
        i < transactions.length;
        i++
    ) {
        if (
            transactions[i].transactionId === id
        ) {
            transaction = transactions[i];
            break;
        }
    }

    if (transaction) {
        box.innerHTML =
            receiptHtml(transaction) +
            `
                <div
                    style="text-align:center;margin-top:12px"
                >
                    <button
                        class="btn"
                        onclick="printReceipt('${transaction.transactionId}')"
                    >
                        Print Receipt
                    </button>
                </div>
            `;
    }
}

function printReceipt(id) {
    let transaction = null;

    for (
        let i = 0;
        i < transactions.length;
        i++
    ) {
        if (
            transactions[i].transactionId === id
        ) {
            transaction = transactions[i];
            break;
        }
    }

    if (!transaction) {
        return;
    }

    const windowPrint =
        window.open(
            "",
            "_blank",
            "width=420,height=650"
        );

    if (!windowPrint) {
        setFlash(
            "Please allow pop-ups to print the receipt.",
            "err"
        );

        render();
        return;
    }

    windowPrint.document.write(`
        <!doctype html>

        <html>
        <head>
            <title>
                ${transaction.transactionId}
                Receipt
            </title>

            <style>
                body {
                    margin: 20px;
                    background: #fff;
                    color: #222;
                }

                .receipt {
                    max-width: 320px;
                    margin: auto;
                    padding: 18px;
                    border: 1px dashed #aaa;
                    font: 12px
                        "Courier New",
                        monospace;
                }

                .receipt-head {
                    text-align: center;
                }

                .rname {
                    font-size: 20px;
                    font-weight: 700;
                }

                .rsub {
                    font-size: 10px;
                    color: #666;
                }

                .receipt hr {
                    border: 0;
                    border-top: 1px dashed #aaa;
                    margin: 10px 0;
                }

                .receipt-line {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }

                .receipt-foot {
                    text-align: center;
                    color: #666;
                    margin-top: 12px;
                }

                @media print {
                    body {
                        margin: 0;
                    }

                    .receipt {
                        border: 0;
                    }
                }
            </style>
        </head>

        <body>
            ${receiptHtml(transaction)}
        </body>
        </html>
    `);

    windowPrint.document.close();

    windowPrint.onload = function () {
        windowPrint.print();
    };
}



function renderDailyReport() {
    let revenue = 0;
    let guests = 0;
    let discount = 0;
    let count = 0;
    let list = [];

    for (let i = 0; i < transactions.length; i++) {
        if (
            transactions[i].paymentStatus ===
            "Paid"
        ) {
            const t = transactions[i];

            revenue += t.total;
            guests += t.guests;
            discount += t.discount;

            count++;

            list[list.length] = t;
        }
    }

    const average =
        guests
            ? revenue / guests
            : 0;

    return `
        <div class="card">
            ${head(
                "Financial Analytics Dashboard",
                "Revenue, guests served, average spending, and completed transactions."
            )}

            ${flash()}

            <div class="summary-grid">
                <div class="stat">
                    <span class="num">
                        ₱${revenue.toLocaleString()}
                    </span>

                    <span class="lbl">
                        Total revenue
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ${guests}
                    </span>

                    <span class="lbl">
                        Guests served
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ₱${average.toFixed(2)}
                    </span>

                    <span class="lbl">
                        Average / guest
                    </span>
                </div>

                <div class="stat">
                    <span class="num">
                        ${count}
                    </span>

                    <span class="lbl">
                        Transactions
                    </span>
                </div>
            </div>

            <p>
                Total discounts:
                <b>
                    ₱${discount.toLocaleString()}
                </b>
            </p>

            ${transactionTable(list)}
        </div>
    `;
}

/* PAGE ROUTER */

const RENDERERS = {
    reservations: renderReservations,
    findReservation: renderFindReservation,
    cancelReservation: renderCancelReservation,
    sortReservations: renderSortReservations,
    tableAvailability: renderTableAvailability,
    assignTable: renderAssignTable,
    waitlist: renderWaitlist,
    checkIn: renderCheckIn,
    buffetPackages: renderBuffetPackages,
    guestCount: renderGuestCount,
    billSummary: renderBillSummary,
    discounts: renderDiscounts,
    payment: renderPayment,
    receipts: renderReceipts,
    dailyReport: renderDailyReport
};

function render() {
    if (
        currentUser &&
        currentUser.role === "Staff" &&
        STAFF_ALLOWED.indexOf(
            activeSection
        ) === -1
    ) {
        activeSection = "reservations";
    }

    renderNav();
    renderStats();

    document.getElementById(
        "content"
    ).innerHTML =
        RENDERERS[activeSection]();

    setDateLimits();
}

tick();
