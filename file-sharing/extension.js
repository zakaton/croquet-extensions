import Extender from "../extension.js";
import UsersExtension from "../users/extension.js";

// https://webtorrent.io/docs
import {} from "../node_modules/webtorrent/webtorrent.debug.js";

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
                this.client.on("torrent", torrent => {
                    this.broadcastSigned(this.sessionId, "new-torrent", {
                        magnetURI : torrent.magnetURI,
                        stuff : "Hello",
                    });
                });
            }
        }
    }
}