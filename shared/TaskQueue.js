var TaskQueue = function (cocurrent, name, hideProgress) {
    this.name = name;
    this.cocurrent = cocurrent || 3;
    this.onGoingTask = 0;
    this.queue = [];
    this.hideProgress = hideProgress;
};

TaskQueue.prototype.addTask = function (task, atBeginning) {
    if (atBeginning) {
        this.queue.unshift(task);
    } else {
        this.queue.push(task);
    }

    if (!this.hideProgress) {
        console.log(
            "TaskAdd Queue:",
            this.name,
            "Length:",
            this.queue.length,
            "OnGoing:",
            this.onGoingTask
        );
    }
    this.executeNext();
};

TaskQueue.prototype.executeNext = function () {
    var self = this;
    while (this.onGoingTask < this.cocurrent && this.queue.length > 0) {
        var task = this.queue.shift();
        this.onGoingTask = this.onGoingTask + 1;

        var onFinish = (function () {
            var executed = 0;
            return function () {
                if (executed == 0) {
                    executed = 1;
                    self.onTaskFinished();
                }
            };
        })();

        try {
            if (!this.hideProgress) {
                console.log(
                    "TaskStart Queue:",
                    this.name,
                    "Length:",
                    this.queue.length,
                    "OnGoing:",
                    this.onGoingTask
                );
            }

            // no mater the task is finished or not, we need to make sure the onFinished has been called
            setTimeout(function () {
                onFinish();
            }, 300000);

            task(onFinish);
        } catch (ex) {
            setTimeout(function () {
                onFinish();
            }, 0);

            throw ex;
        }
    }
};

TaskQueue.prototype.onTaskFinished = function () {
    this.onGoingTask = this.onGoingTask - 1;
    this.onGoingTask = this.onGoingTask < 0 ? 0 : this.onGoingTask;
    if (!this.hideProgress) {
        console.log(
            "TaskFinished Queue:",
            this.name,
            "Length:",
            this.queue.length,
            "OnGoing:",
            this.onGoingTask
        );
    }
    var self = this;
    setTimeout(function () {
        self.executeNext();
    }, 0);
};

/**
 * Remove the taskqueue to fresh states
 */
TaskQueue.prototype.reset = function () {
    while (this.queue.length > 0) {
        this.queue.pop();
    }
    this.onGoingTask = 0;
};

module.exports = TaskQueue;
