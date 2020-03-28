import Extender from "../extension.js";

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model) {
            init() {
                super.init();
            }
        }
    },
    viewExtension(View) {
        Object.assign(View.prototype, THREE.EventDispatcher.prototype);
        return class extends Extender.extendView(View) {
            constructor(model) {
                super(model);
                this.model = model;
            }
        }
    }
}