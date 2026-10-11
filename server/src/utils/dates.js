function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKey(value) {
    return value instanceof Date ? isoDate(value) : String(value).slice(0, 10);
}

function monthStart() {
    const now = today();
    return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function previousMonthStart() {
    const now = today();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function monthLabel(date) {
    return `${date.toLocaleString("en-US", { month: "short" })} ${String(date.getFullYear()).slice(-2)}`;
}

module.exports = { today, isoDate, dateKey, monthStart, previousMonthStart, monthLabel };
