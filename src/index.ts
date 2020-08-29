import "reflect-metadata";
import { createConnection } from "typeorm";
import { __production__, COOKIE_NAME } from "./constants";
import path from "path";
import { User } from "./entities/User";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { Event } from "./entities/Event";
import { EventResolver } from "./resolvers/event";
import { MyContext} from "./types";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
import { authChecker } from "./middleware/authChecker";

const main = async () => {
  await createConnection({
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

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        secure: __production__,
        sameSite: "lax",
      },
      secret: "adjaopdjapdjoajpjadppojadjajdop",
      saveUninitialized: false,
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver, EventResolver],
      validate: false,
      authChecker: authChecker,
    }),
    context: ({ req, res }) => ({ req, res } as MyContext),
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
