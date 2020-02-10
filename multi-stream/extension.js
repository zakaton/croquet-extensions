import Extender from "../extension.js";

AudioContext = AudioContext || webkitAudioContext;

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model) {
            init() {
                super.init();
            }
        }
    },
    viewExtension(View) {
        return class extends Extender.extendView(View) {
            constructor(model) {
                super(model);
                this.model = model;

                this.audioContext = new AudioContext();
                this.tracks = [];
                
                window.addEventListener("click", event => {
                    if(this.audioContext.state !== "running")
                        this.audioContext.resume();
                });
            }

            copyAudioTrack(track) {
                const mediaStreamDestinationNode = this.audioContext.createMediaStreamDestination();
                const mediaStreamSourceNode = this.audioContext.createMediaStreamSource(new MediaStream(track));
                    mediaStreamSourceNode.connect(mediaStreamDestinationNode);
            }
            copyVideoTrack(track) {
                const settings = track.getSettings();

                const video = document.createElement("video");
                    video.autoplay = true;
                    video.muted = true;
                    video.srcObject = new MediaStream([track]);

                const canvas = document.createElement("canvas");
                    canvas.height = settings.height;
                    canvas.width = settings.width;

                const canvasContext = canvas.getContext("2d");
                const intervalId = setInterval(() => {
                    canvasContext.drawImage(video, 0, 0);
                }, 1000/settings.frameRate);

                const stream = canvas.captureStream();
                const trackCopy = stream.getVideoTracks()[0];

                this.tracks.push({
                    oldTrack : track,
                    track : trackCopy,
                    stream,
                    intervalId,
                    cleared : false,
                    clear() {
                        if(this.cleared) {
                            clearInterval(this.intervalId);
                            this.cleared = true;
                        }
                    }
                });

                return track;
            }
            copyTrack(track) {
                switch(track.kind) {
                    case "audio":
                        return this.copyAudioTrack(track);
                    case "video":
                        return this.copyVideoTrack(track);
                    default:
                        return null;
                }
            }
            copyTracks(tracks) {
                return tracks.map(track => this.copyTrack(track));
            }
            copyStream(stream) {
                return new MediaStream(this.copyTracks(stream.getTracks()));
            }
        }
    }
}