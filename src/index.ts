import "reflect-metadata";
import dotenv from "dotenv-safe";
import { createConnection, getConnectionOptions } from "typeorm";
import { __production__, COOKIE_NAME } from "./constants";
import path from "path";
import { User } from "./entities/User";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { Event } from "./entities/Event";
import { EventResolver } from "./resolvers/event";
import { MyContext } from "./types";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
import { authChecker } from "./middleware/authChecker";
import cors from "cors";
import { Reservation } from "./entities/Reservation";
import { initializeHandlebars } from "./mail";
import { ReservationResolver } from "./resolvers/reservation";

dotenv.config();

console.log(
	"Env variables: ",
	process.env.EMAIL,
	process.env.EMAIL_PASSWORD,
	process.env.CORS
);

const main = async () => {
	const connectionOptions = await getConnectionOptions();

	Object.assign(connectionOptions, {
		synchronize: !__production__,
		logging: !__production__,
		migrations: [path.join(__dirname, "migrations")],
		entities: [User, Event, Reservation],
	});

	const conn = await createConnection(connectionOptions);
	await conn.runMigrations();

	const app = express();

	const RedisStore = connectRedis(session);
	const redisClient = redis.createClient();

	if (__production__) app.set("trust proxy", 1);
 
	app.use(
		cors({
			credentials: true,
			origin: process.env.CORS,
		})
	);

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
				sameSite: __production__ ? "none" : "lax",
			},
			secret: "adjaopdjapdjoajpjadppojadjajdop",
			saveUninitialized: false,
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver, EventResolver, ReservationResolver],
			validate: false,
			authChecker: authChecker,
		}),
		context: ({ req, res }) =>
			({ req, res, redis: redisClient } as MyContext),
	});

	apolloServer.applyMiddleware({ app, cors: false });

	app.get("/", (_, res) => {
		res.send("Express server working.");
	});

	await initializeHandlebars();

	const PORT = 4001;

	app.listen(PORT, () =>
		console.log(`Express server started on localhost:${PORT}`)
	);
};

main();
