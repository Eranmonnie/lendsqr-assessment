declare module 'swagger-jsdoc' {
  interface Options {
    [key: string]: any;
  }
  function swaggerJsdoc(options?: Options): any;
  export default swaggerJsdoc;
}
