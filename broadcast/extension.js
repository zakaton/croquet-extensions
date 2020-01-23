export default {
    modelExtension(Model) {
        return class extends Model {
            init() {
                super.init();
                this.subscribe(this.sessionId, "broadcast", this.broadcast);
            }

            broadcast({scope, event, data}) {
                this.publish(scope, event, data);
            }
        }
    },
    viewExtension(View) {
        return class extends View {
            constructor(model) {
                super(model);
                this.model = model;
            }

            broadcast(scope, event, data) {
                this.publish(this.sessionId, "broadcast", {scope, event, data});
            }
        }
    }
}