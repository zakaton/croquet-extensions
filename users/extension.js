import Extender from "../extension.js";
import EncryptionExtension from "../encryption/extension.js";

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model, EncryptionExtension.modelExtension) {
            init() {
                super.init();
                this.users = [];
            }
        
            addUser() {
        
            }
            removeUser() {
        
            }
            changeUsername() {
        
            }
        
            message() {
        
            }
        
            get() {
        
            }
            set() {
        
            }
        }
    },
    
    viewExtension(View) {
        return class extends Extender.extendView(View, EncryptionExtension.viewExtension) {
            constructor(model) {
                super(model);
            }
        
            register() {
        
            }
        
            send() {
        
            }
            receive() {
        
            }
        
            get() {
        
            }
            set() {
        
            }
        }
    }
}