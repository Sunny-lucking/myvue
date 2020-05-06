function Watcher(fn) {
    this.fn = fn;
}

Watcher.prototype.update = function () {
    this.fn()
}
