# Remembered Backend

### Requirements

```
  node 14.17.0 (npm 6.14.13) & above
  Postgresql server (Database Name: test)
```

### Instructions

1. run `npm install`
2. Change dbConfig file which is inside the database directory
3. run `npm run start` to start server
4. start developing

### Swagger UI

`http://localhost:5001/api-docs/`

### add country data
Run `npm run seed:country`

This command add ten sample countries data into your database. If data is already exists then it will keep data as it is.

### create admin
Run `npm run seed:admin`

This command add one admin into your database. If data is already exists then it will keep data as it is. For the credential you can check src/seeds/admin.ts

### Database set-up

1. Local Environment
   Run `npm run start`

   For the local environment you need to set your local database credential into src/database/config in development object.

2. Production Environment
  1. For Windows `npm run start:windows` 
  2. For Ubuntu  `npm run start:ubuntu`

  Database struture `https://lucid.app/lucidchart/911bb30d-eb75-4ae5-8970-0d0f29c20df2/edit?page=0_0#`