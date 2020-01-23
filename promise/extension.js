export default {
    modelExtension(Model) {
        return class extends Model {
            init() {
                super.init();
            }
        }
    },
    viewExtension(View) {
        return class extends View {
            constructor(model) {
                super(model);
                this.model = model;
            }

            publishPromise(scope, event, data, scope2, event2, conditional = () => true) {
                return new Promise((resolve, reject) => {
                    var resolved = false;
                    this.subscribe(scope2, event2, data2 => {
                        // How to unsubscribe this callback once it resolves?
                        if(!resolved && conditional(data2)) {
                            resolved = true; // just in case
                            resolve(data2);
                        }
                    });
                    this.publish(scope, event, data);
                });
            }
        }

    }
}