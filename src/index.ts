import "reflect-metadata";
import { createConnection } from "typeorm";
import { __production__ } from "./constants";
import path from "path";
import { User } from "./entities/User";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { Event } from "./entities/Event";
import { EventResolver } from "./resolvers/event";

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    username: "postgres",
    password: "postgres",
    synchronize: !__production__,
    logging: !__production__,
    migrations: [path.join(__dirname, "migrations")],
    entities: [User, Event],
    database: "api",
  });

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver, EventResolver],
      validate: false,
    }),
    context: () => ({ })
  });

  apolloServer.applyMiddleware({ app });

  app.get("/", (_, res) => {
    res.send("Express server working.");
  });

  const PORT = 4000;

  app.listen(PORT, () =>
    console.log(`Express server started on localhost:${PORT}`)
  );
};

main();
