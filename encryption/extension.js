// https://github.com/dchest/tweetnacl-js
import {} from "../node_modules/tweetnacl/nacl-fast.min.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function newNonce() {return nacl.randomBytes(nacl.box.nonceLength)};

export default {
    modelExtension(Model) {
        return class extends Model {
            init() {
                super.init();
            }
        
            verify(message, signature, publicKey) {
                return nacl.sign.detached.verify(message, signature, publicKey);
            }
            verifyMessage(scope, event, {publicKey, data, signature}) {
                const message = textEncoder.encode([scope, event, data]);
                return this.verify(message, signature, publicKey);
            }
        }
    },
    viewExtension(View) {
        return class extends View {
            constructor(model) {
                super(model);
        
                this.keyPairs = {
                    encryption : nacl.box.keyPair(),
                    signature : nacl.sign.keyPair(),
                };
            }
        
            encode(message) {
                return textEncoder.encode(JSON.stringify(message));
            }
            decode(message) {
                return JSON.parse(textDecoder.decode(message));
            }
        
            sign(message) {
                return nacl.sign.detached(this.encode(message), this.keyPairs.signature.secretKey);
            }
            verify(message, signature) {
                return nacl.sign.detached.verify(this.encode(message), signature, this.keyPairs.signature.publicKey);
            }
        
            publishSigned(scope, event, data) {
                this.publish(scope, event, {
                    publicKey : this.keyPairs.signature.publicKey,
                    data,
                    signature : this.sign(this.encode([scope, event, data])),
                });
            }
        
            encrypt(message, publicKey) {
                const nonce = newNonce();
                return {
                    nonce,
                    encryption : nacl.box(this.encode(message), nonce, publicKey, this.keyPairs.encryption.secretKey),
                };
            }
            decrypt(encryption, publicKey, nonce) {
                return nacl.box.open(encryption, nonce, publicKey, this.keyPairs.encryption.secretKey);
            }
        
            publishEncrypted(scope, event, data, publicKey) {
                const {nonce, encryption} = this.encrypt([scope, event, data], publicKey);
                this.pubish(scope, event, {
                    publicKey,
                    nonce,
                    encryption,
                });
            }
        }
    }
}

/*
class Model extends Croquet.Model {
    init() {
        super.init();
    }

    verify(message, signature, publicKey) {
        return nacl.sign.detached.verify(message, signature, publicKey);
    }
    verifyMessage(scope, event, {publicKey, data, signature}) {
        const message = textEncoder.encode([scope, event, data]);
        return this.verify(message, signature, publicKey);
    }
}

class View extends Croquet.View {
    constructor(model) {
        super(model);

        this.keyPairs = {
            encryption : nacl.box.keyPair(),
            signature : nacl.sign.keyPair(),
        };
    }

    encode(message) {
        return textEncoder.encode(JSON.stringify(message));
    }
    decode(message) {
        return JSON.parse(textDecoder.decode(message));
    }

    sign(message) {
        return nacl.sign.detached(this.encode(message), this.keyPairs.signature.secretKey);
    }
    verify(message, signature) {
        return nacl.sign.detached.verify(this.encode(message), signature, this.keyPairs.signature.publicKey);
    }

    publishSigned(scope, event, data) {
        this.publish(scope, event, {
            publicKey : this.keyPairs.signature.publicKey,
            data,
            signature : this.sign(this.encode([scope, event, data])),
        });
    }

    encrypt(message, publicKey) {
        const nonce = newNonce();
        return {
            nonce,
            encryption : nacl.box(this.encode(message), nonce, publicKey, this.keyPairs.encryption.secretKey),
        };
    }
    decrypt(encryption, publicKey, nonce) {
        return nacl.box.open(encryption, nonce, publicKey, this.keyPairs.encryption.secretKey);
    }

    publishEncrypted(scope, event, data, publicKey) {
        const {nonce, encryption} = this.encrypt([scope, event, data], publicKey);
        this.pubish(scope, event, {
            publicKey,
            nonce,
            encryption,
        });
    }
}

export default {Model, View};
*/