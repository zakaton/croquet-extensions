// https://github.com/dchest/tweetnacl-js
import {} from "../node_modules/tweetnacl/nacl-fast.min.js";
function newNonce() {return nacl.randomBytes(nacl.box.nonceLength)};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export default {
    modelExtension(Model) {
        return class extends Model {
            init() {
                super.init();
            }

            sortObject(object) {
                const sortedObject = {};
                Object.keys(object).sort().forEach(key => sortedObject[key] = object[key]);
                return sortedObject;
            };

            encode(message) {
                return textEncoder.encode(JSON.stringify(message));
            }
            decode(message) {
                return JSON.parse(textDecoder.decode(message));
            }
            
            verify(message, signature, publicKey) {
                return nacl.sign.detached.verify(this.encode(message), signature, publicKey);
            }
            verifyMessage(scope, event, {publicKey, data, signature}) {
                data = this.sortObject(data);

                if(this.verify([scope, event, data], signature, publicKey))
                    return data;
            }
        }
    },
    viewExtension(View) {
        return class extends View {
            constructor(model) {
                super(model);
                this.model = model;
        
                this.keyPairs = {
                    encryption : nacl.box.keyPair(),
                    signature : nacl.sign.keyPair(),
                };
            }

            loadFromLocalStorage() {
                if(localStorage.getItem("keyPairs") !== null) {
                    this.keyPairs = JSON.parse(localStorage.getItem("keyPairs"));
                    ["encryption", "signature"].forEach(keyPairType => {
                        ["publicKey", "secretKey"].forEach(keyType => {
                            this.keyPairs[keyPairType][keyType] = new Uint8Array(Object.values(this.keyPairs[keyPairType][keyType]));
                        });
                    });
                }
                else {
                    localStorage.setItem("keyPairs", JSON.stringify(this.keyPairs));
                }
            }
        
            sign(message) {
                return nacl.sign.detached(this.model.encode(message), this.keyPairs.signature.secretKey);
            }
            verify(message, signature) {
               return this.model.verify(message, signature, this.keyPairs.signature.publicKey);
            }
            signData(scope, event, data) {
                data = this.model.sortObject(data);
                const message = [scope, event, data]
                return {
                    data,
                    publicKey : new Uint8Array(this.keyPairs.signature.publicKey),
                    signature : this.sign(message),
                }
            };
        
            encrypt(message, publicKey) {
                const nonce = newNonce();
                return {
                    encryption : nacl.box(this.model.encode(message), nonce, publicKey, this.keyPairs.encryption.secretKey),
                    nonce,
                };
            }

            decrypt(encryption, publicKey, nonce) {
                return this.model.decode(nacl.box.open(encryption, nonce, publicKey, this.keyPairs.encryption.secretKey));
            }
        }
    }
}