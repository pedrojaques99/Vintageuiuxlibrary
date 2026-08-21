// Reexport: o caminho que os itens do registry esperam ("@/components/ui/…").
// O palco tem export DEFAULT porque o `book-3d` o carrega por React.lazy, e
// lazy() só aceita um módulo com default.
export * from "../../../registry/visant/ui/book-stage";
export { default } from "../../../registry/visant/ui/book-stage";
