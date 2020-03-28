import Extender from "../extension.js";
import UsersExtension from "../users/extension.js";

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

                this.client = new WebTorrent();

                this.client.on("error", error => {
                    console.error(error);
                });
                this.client.on("torrent", t => console.log(t))
                
                this.subscribe(this.sessionId, "new-torrent", data => {
                    const {magnetURI, metadata} = data.data;
                    const {fromIndex} = data;

                    this.clearUnusedTorrents()
                        .then(() => {
                            if(!this.client.get(magnetURI)) {
                                this.client.add(magnetURI, torrent => {
                                    torrent.on("done", () => {
                                        this.dispatchEvent({
                                            type : "share",
                                            message : {
                                                fromIndex,
                                                metadata,
                                                files : torrent.files,
                                            }
                                        });
                                    });
                                });
                            }
                        });
                });
            }

            share(file, metadata) {
                new Promise(resolve => {
                    const torrent = this.client.get(file);
                    if(torrent)
                        torrent.destroy(() => resolve());
                    else
                        resolve();
                }).then(() => {
                    this.clearUnusedTorrents()
                        .then(() => {
                            this.client.seed(file, torrent => {
                                this.broadcastSigned(this.sessionId, "new-torrent", {
                                    magnetURI : torrent.magnetURI,
                                    metadata : this.model.sortObject(metadata)
                                });
                            });
                        });
                });
            }

            clearUnusedTorrents() {
                return Promise.all(this.client.torrents.map(torrent => new Promise(resolve => {
                    if(torrent.progress == 0)
                        torrent.destroy(() => resolve())
                    else
                        resolve();
                })))
            }
        }
    }
}