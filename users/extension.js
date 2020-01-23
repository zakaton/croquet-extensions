import Extender from "../extension.js";
import EncryptionExtension from "../encryption/extension.js";
import Broadcast from "../broadcast/extension.js";
import EventDispatcher from "../event-dispatcher/extension.js";

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model, Broadcast.modelExtension, EventDispatcher.modelExtension, EncryptionExtension.modelExtension) {
            init() {
                super.init();
                this.users = [];

                this.subscribe(this.sessionId, "register", this.register);
                //this.subscribe(this.sessionId, "unregister", this.unregister);

                this.subscribe(this.sessionId, "broadcast-signed", this.broadcastSigned);

                this.subscribe(this.sessionId, "view-exit", this.viewExit);
            }

            findUserIndex(signaturePublicKey_or_viewId) {
                return signaturePublicKey_or_viewId instanceof Uint8Array?
                    this.findUserIndexBySignaturePublicKey(signaturePublicKey_or_viewId) :
                    this.findUserIndexByViewId(signaturePublicKey_or_viewId);
            }
            findUserIndexBySignaturePublicKey(signaturePublicKey) {
                return this.users.findIndex(user => {
                    return nacl.verify(signaturePublicKey, user.publicKeys.signature);
                }) 
            }
            findUserIndexByViewId(viewId) {
                return this.users.findIndex(user => {
                    return user.viewId == viewId;
                });
            }
            findUser(signaturePublicKey_or_viewId) {
                return this.users[this.findUserIndex(signaturePublicKey_or_viewId)];
            }

            unpackSignedUserMessage(scope, event, data) {
                const user = this.users[data.userIndex];
                return {
                    data : this.verifyMessage(scope, event, data),
                    user : user? user.publicKeys.signature : this.findUser(data.publicKey),
                }
            }
        
            register() {
                const {data, user} = this.unpackSignedUserMessage(this.sessionId, "register", ...arguments);                

                if(data && !user) {
                    const newUser = {
                        publicKeys : {
                            signature : data.signaturePublicKey,
                            encryption : data.encryptionPublicKey,
                        },
                        viewId : data.viewId,
                    };

                    this.users.push(newUser);
                    this.publish(this.sessionId, "new-user", this.users.indexOf(newUser));
                }
                else if(user) {
                    user.viewId = data.viewId;
                    this.publish(this.sessionId, "returning-user", this.users.indexOf(user));
                }
            }

            viewExit(viewId) {
                const userIndex = this.findUserIndex(viewId);
                if(userIndex >= 0) {
                    this.publish(this.sessionId, "user-exit", userIndex);
                }
            }

            /*
            unregister() {
                const {data, user} = this.unpackSignedUserMessage(this.sessionId, "unregister", ...arguments);

                if(data && user) {
                    const userIndex = this.users.indexOf(user)
                    this.publish(this.sessionId, "remove-user", user);
                    this.users.splice(userIndex, 1);
                }
            }
            */

            broadcastSigned() {
                const {data, user} = this.unpackSignedUserMessage(this.sessionId, "broadcast-signed", ...arguments);
                if(data && user) {
                    const {scope, event} = data;
                    this.publish(scope, event, {
                        data : data.data,
                        fromIndex : this.users.indexOf(user),
                    });
                }
            }
        }
    },
    
    viewExtension(View) {
        return class extends Extender.extendView(View, Broadcast.viewExtension, EventDispatcher.viewExtension, EncryptionExtension.viewExtension) {
            constructor(model) {
                super(model);
                this.model = model;

                this.dateJoined = Date.now();
            }
        
            register() {
                if(!this.isRegistered) {
                    this.publish(this.sessionId, "register", this.signData(this.sessionId, "register", {
                        timestamp : Date.now(),
                        encryptionPublicKey : this.keyPairs.encryption.publicKey,
                        signaturePublicKey : this.keyPairs.signature.publicKey,
                        viewId : this.viewId,
                    }));
                }
            }
            get isRegistered() {
                return this.model.findUser(this.keyPairs.signature.publicKey);
            }

            /*
            unregister() {
                if(this.isRegistered) {
                    const [scope, event, data] = [this.sessionId, "unregister", {timestamp : Date.now()}];
                    this.publish(scope, event, this.signData(scope, event, data));
                }
            }
            */

            broadcastSigned(scope, event, data) {
                if(this.isRegistered) {
                    const [_scope, _event, _data] = [this.sessionId, "broadcast-signed", {scope, event, data}];
                    this.publish(_scope, _event, this.signData(_scope, _event, _data));
                }
            }

            get userIndex() {
                return this.model.findUserIndex(this.keyPairs.signature.publicKey);
            }

            encryptUserData(data, userIndex) {
                return this.encrypt(data, this.model.users[userIndex].publicKeys.encryption);
            }
            decryptUserData({encryption, nonce}, userIndex) {
                return this.decrypt(encryption, this.model.users[userIndex].publicKeys.encryption, nonce);
            }

            messageUser(scope, event, data, userIndex) {
                if(this.isRegistered) {
                    this.broadcast(scope, event, {
                        fromIndex : this.userIndex,
                        toIndex : userIndex,
                        data : this.encryptUserData(data, userIndex),
                        timestamp : Date.now(),
                    });
                }
            }
            decryptUserMessage({toIndex, fromIndex, data}) {
                if(this.userIndex == toIndex) {
                    return this.decryptUserData(data, fromIndex);
                }
            }
        }
    }
}