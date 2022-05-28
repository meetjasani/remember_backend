const swaggerUi = require('swagger-ui-express');
import swaggerJsDoc from 'swagger-jsdoc';

const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'Memorial',
      version: '1.0.0'
    },
    basePath: '/api/v1',
    schemes: [
      "http",
      "https"
    ],
    tags: [
      {
        name: "User",
        description: "Operations about User"
      },
      {
        name: "Admin",
        description: "Operations about Admin"
      },
      {
        name: "General",
        description: "Operations in General"
      },
      {
        name: "MemorialHall",
        description: "Operations in Memorial Hall"
      }
    ],
    securityDefinitions: {
      Token: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
      }
    }
  },
  apis: [
    './src/api/routes/user.ts',
    './src/api/routes/general.ts',
    './src/api/routes/admin.ts',
    './src/api/routes/memorialHall.ts',
  ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export const setSwagger = (app: any) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
};
