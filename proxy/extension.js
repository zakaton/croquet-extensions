import Extender from "../extension.js";
import EventDispatcherExtension from "../event-dispatcher/extension.js";

function getValueAtPath(object, path = []) {
    path = path.slice();
    while(path.length)
        object = object[path.shift()];
    return object;
}

function setValueAtPath(object, path, newValue) {
    path = path.slice();
    while(path.length > 1)
        object = object[path.shift()];
    const oldValue = object[path[0]];
    object[path[0]] = newValue;
    return oldValue;
}

function deleteValueAtPath(object, path) {
    return setValueAtPath(object, path);
}

export default {
    modelExtension(Model) {
        return class extends Extender.extendModel(Model) {
            init() {
                super.init();

                this.subscribe(this.sessionId, "set", this.set);
                this.subscribe(this.sessionId, "deleteProperty", this.deleteProperty);
            }

            willSet() {
                return true;
            }
            set({path, newValue, viewId}) {
                const willSet = this.willSet(...arguments);
                if(willSet) {
                    const oldValue = setValueAtPath(this, path, newValue);
                    this.publish(this.sessionId, "didSet", {path, newValue, oldValue, viewId});
                }
            }

            willDeleteProperty() {
                return true;
            }
            deleteProperty({path, viewId}) {
                const willDeleteProperty = this.willDeleteProperty(...arguments);
                if(willDeleteProperty) {
                    const oldValue = deleteValueAtPath(this, path);
                    this.publish(this.sessionId, "didDeleteProperty", {path, oldValue, viewId});
                }
            }
        }
    },
    viewExtension(View) {
        return class extends Extender.extendView(View, EventDispatcherExtension.viewExtension) {
            constructor(model) {
                super(model);
                this._model = model;
                this.model = this.createDeepProxy(model);

                this.subscribe(this.sessionId, "didSet", this.didSet);
                this.subscribe(this.sessionId, "didDeleteProperty", this.didDeleteProperty);
            }

            createDeepProxy(object, path = []) {
                const thisView = this;
                return new Proxy(object, {
                    get(object, key) {
                        const value = object[key];

                        if(typeof value == 'object')
                            return thisView.createDeepProxy(value, path.concat(key));
                        else if(thisView.isValueFunction(value))
                            return thisView.stringToFunction(value);
                        else
                            return value;
                    },

                    set(object, key, newValue, proxy) {
                        const data = {
                            viewId: thisView.viewId,
                            path: path.concat(key),
                            newValue,
                        };
                        const willSet = thisView.willSet(data);

                        data.newValue = thisView.replaceFunctionsWithStrings(newValue);

                        if(willSet)
                            thisView.publish(thisView.sessionId, "set", data);

                        return true;
                    },

                    deleteProperty(object, key) {
                        const data = {
                            viewId: thisView.viewId,
                            path: path.concat(key),
                        };

                        const willDeleteProperty = thisView.willDeleteProperty(data);
                        if(willDeleteProperty)
                            thisView.publish(thisView.sessionId, "deleteProperty", data);

                        return true;
                    },
                });
            }

            willSet() {
                return true;
            }
            didSet({viewId, path, newValue, oldValue}) {
                newValue = this.replaceFunctionStringsWithFunctions(newValue);
                oldValue = this.replaceFunctionStringsWithFunctions(oldValue);

                this.dispatchEvent({
                    type: "didSet",
                    message : {viewId, path, newValue, oldValue}
                });
            }

            willDeleteProperty() {
                return true;
            }
            didDeleteProperty({viewId, path, oldValue}) {
                this.dispatchEvent({
                    type: "didSet",
                    message : {viewId, path, oldValue}
                });

                this.dispatchEvent({
                    type: "didDeleteProperty",
                    message: {viewId, path, oldValue},
                });
            }

            isValueFunction(value) {
                return typeof value == 'string' && value.startsWith("/*FUNCTION*/");
            }
            functionToString(_function) {
                return `/*FUNCTION*/${_function}`;
            }
            stringToFunction(string) {
                return Function(`return ${string}`)();
            }
            replaceFunctionsWithStrings(value) {
                if(typeof value == 'function')
                    return this.functionToString(value);
                else if(typeof value == 'object') {
                    if(Array.isArray(value))
                        return value.map(_value => this.replaceFunctionsWithStrings(_value));
                    else {
                        const object = {};
                        for(let key in value) {
                            const _value = value[key];
                            object[key] = this.replaceFunctionsWithStrings(_value);
                        }
                        return object;
                    }
                }
                else
                    return value;
            }
            replaceFunctionStringsWithFunctions(value) {
                if(this.isValueFunction(value))
                    return this.stringToFunction(value);
                else if(typeof value == 'object') {
                    if(Array.isArray(value))
                        return value.map(_value => this.replaceFunctionStringsWithFunctions(_value));
                    else {
                        const object = {};
                        for(let key in value) {
                            const _value = value[key];
                            object[key] = this.replaceFunctionStringsWithFunctions(_value);
                        }
                        return object;
                    }
                }
                else
                    return value;
            }
        }
    }
}