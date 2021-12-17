const sanitize = function (str, to_lower=false) {
    const regex = new RegExp("^[A-Za-z0-9_-]*");
    
    str = str.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
    
    if (to_lower === true) {
        return str.toLowerCase();
    } else {
        return str;
    }
}

module.exports = {
    sanitize
}