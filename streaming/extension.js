import Extender from "../extension.js";
import UsersExtension from "../users/extension.js";

// https://github.com/feross/simple-peer
import {} from "../node_modules/simple-peer/simplepeer.min.js";

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model, UsersExtension.modelExtension) {
            init() {
                super.init();
            }
        }
    },
    viewExtension(View) {
        return class extends Extender.extendView(View, UsersExtension.viewExtension) {
            constructor(model) {
                super(model);
                this.model = model;

                this.peers = [];
                this.subscribe(this.sessionId, "new-user", userIndex => {
                    this.setupPeer(userIndex);
                });
                this.subscribe(this.sessionId, "returning-user", userIndex => {
                    this.setupPeer(userIndex);
                });

                this.subscribe(this.sessionId, "user-exit", userIndex => {
                    const peer = this.peers[userIndex];
                    if(peer)
                        peer.destroy();
                    this.setupPeer(userIndex);
                });

                this.addEventListener("peer-connected", event => {
                    const {peer, userIndex} = event.message;
                    peer.on("signal", signalData => {
                        if(signalData.renegotiate) {
                            this.messageUser(this.sessionId, "connect-peer-renegotiate", {signalData}, userIndex);
                        }
                        else {
                            this.messageUser(this.sessionId, `connect-peer-renegotiate-${signalData.type}`, {signalData}, userIndex);
                        }
                    });
                });
                
                this.subscribe(this.sessionId, "connect-peer-offer", encryptedData => {
                    const {fromIndex, toIndex, timestamp} = encryptedData;
                    if(timestamp > this.dateJoined && this.userIndex == toIndex && !this.isConnectedToUser(fromIndex)) {
                        const {signalData} = this.decryptUserMessage(encryptedData, fromIndex);
                        if(signalData) {
                            if(signalData.type == "offer") {
                                this.peers[fromIndex].signal(signalData);
                            }
                        }
                        else {
                            console.error("unable to decrypt data");
                        }
                    }
                });

                this.subscribe(this.sessionId, "connect-peer-answer", encryptedData => {
                    const {fromIndex, toIndex, timestamp} = encryptedData;
                    if(timestamp > this.dateJoined && !this.isConnectedToUser(fromIndex)) {
                        if(this.userIndex == toIndex) {
                            const {signalData} = this.decryptUserMessage(encryptedData, fromIndex);
                            if(signalData && signalData.type == "answer") {
                                this.peers[fromIndex].signal(signalData);
                            }
                        }
                    }
                });

                this.subscribe(this.sessionId, "connect-peer-renegotiate", encryptedData => {
                    const {fromIndex, toIndex, timestamp} = encryptedData;
                    if(timestamp > this.dateJoined && this.isConnectedToUser(fromIndex)) {
                        if(this.userIndex == toIndex) {
                            const {signalData} = this.decryptUserMessage(encryptedData, fromIndex);
                            if(signalData && signalData.renegotiate) {
                                this.peers[fromIndex].signal(signalData);
                            }
                        }
                    }
                });

                this.subscribe(this.sessionId, "connect-peer-renegotiate-offer", encryptedData => {
                    const {fromIndex, toIndex, timestamp} = encryptedData;
                    if(timestamp > this.dateJoined && this.isConnectedToUser(fromIndex)) {
                        if(this.userIndex == toIndex) {
                            const {signalData} = this.decryptUserMessage(encryptedData, fromIndex);
                            if(signalData && signalData.type == "offer") {
                                this.peers[fromIndex].signal(signalData);
                            }
                        }
                    }
                });

                this.subscribe(this.sessionId, "connect-peer-renegotiate-answer", encryptedData => {
                    const {fromIndex, toIndex, timestamp} = encryptedData;
                    if(timestamp > this.dateJoined && this.isConnectedToUser(fromIndex)) {
                        if(this.userIndex == toIndex) {
                            const {signalData} = this.decryptUserMessage(encryptedData, fromIndex);
                            if(signalData && signalData.type == "answer") {
                                this.peers[fromIndex].signal(signalData);
                            }
                        }
                    }
                });
            }

            setupPeer(userIndex) {
                if(userIndex !== this.userIndex && userIndex >= 0) {
                    delete this.peers[userIndex];

                    const peer = new SimplePeer({
                        initiator : false,
                        trickle : false,
                        answerOptions: { 
                            mandatory: { 
                                OfferToReceiveAudio: true, 
                                OfferToReceiveVideo: true 
                            } 
                        }
                    });

                    peer.on("connect", () => {
                        console.log("Connected!", peer);
                        this.dispatchEvent({
                            type : "peer-connected",
                            message : {peer, userIndex},
                        });
                    });

                    peer.on("close", () => {
                        this.setupPeer(userIndex);
                    });

                    peer.on("error", error => {
                        peer.destroy();
                        this.setupPeer(userIndex);
                    });

                    peer.on("signal", signalData => {
                        if(signalData.type == "answer")
                            this.messageUser(this.sessionId, "connect-peer-answer", {signalData}, userIndex);
                    });

                    this.peers[userIndex] = peer;
                }
            }

            connectPeer(userIndex) {
                return new Promise((resolve, reject) => {
                    if(this.isRegistered && !this.isConnectedToUser(userIndex) && this.userIndex !== userIndex) {
                        const peer = new SimplePeer({
                            initiator : true,
                            trickle : false,
                            answerOptions: { 
                                mandatory: { 
                                    OfferToReceiveAudio: true, 
                                    OfferToReceiveVideo: true 
                                } 
                            }
                        });

                        peer.on("connect", () => {
                            this.peers[userIndex] = peer;
                            console.log("Connected!", peer);
                            this.dispatchEvent({
                                type : "peer-connected",
                                message : {peer, userIndex},
                            });
                            resolve(peer);
                        });

                        peer.on("close", () => {
                            this.setupPeer(userIndex);
                        });

                        peer.on("error", error => {
                            peer.destroy();
                        });

                        peer.on("signal", signalData => {
                            if(signalData.type == "offer")
                                this.messageUser(this.sessionId, "connect-peer-offer", {signalData}, userIndex);
                        });

                        this.peers[userIndex] = peer;
                    }
                    else {
                        reject("peer already created between users, or you're trying to connect to yourself");
                    }
                });
            }

            isConnectedToUser(userIndex) {
                const peer = this.peers[userIndex];
                if(peer)
                    return peer.connected;
            }
        }
    }
}