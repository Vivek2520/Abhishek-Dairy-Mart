const EventEmitter = require('events');

// Single shared emitter used across controllers/services to broadcast changes
// For example, admin endpoints emit "dataChanged" and website clients can
// subscribe via Server Sent Events to refresh data in real time.

class AppEventBus extends EventEmitter {}

module.exports = new AppEventBus();
