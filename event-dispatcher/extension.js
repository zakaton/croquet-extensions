import Extender from "../extension.js";
import {EventDispatcher} from "../node_modules/three/src/core/EventDispatcher.js";

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model) {
            init() {
                super.init();
            }
        }
    },
    viewExtension(View) {
        Object.assign(View.prototype, EventDispatcher.prototype);
        return class extends Extender.extendView(View) {
            constructor(model) {
                super(model);
                this.model = model;
            }
        }
    }
}