export default {
    extend(Class, ...extensions) {
        return extensions.reduce((extendedClass, extend) => extend(extendedClass), Class);
    },
    extendModel(Model, ...extensions) {
        return this.extend(...arguments);
    },
    extendView(View, ...extensions) {
        return this.extend(...arguments);
    },
}