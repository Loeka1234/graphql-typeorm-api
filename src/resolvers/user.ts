import {
	Resolver,
	Mutation,
	Field,
	Arg,
	ObjectType,
	Ctx,
	Query,
	FieldResolver,
	Root,
} from "type-graphql";
import { User } from "../entities/User";
import argon2 from "argon2";
import { MyContext } from "../types";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { sendMailWithTemplate } from "../mail";
import { v4 } from "uuid";
import { FieldError } from "../utils/FieldError";
import { isEmail } from "class-validator";
import { isValidPassword } from "../validation/isValidPassword";

// @InputType()
// class RegisterInput {
//   @Field()
//   username: string;

//   @Field()
//   password: string;

//   @Field()
//   email: string;
// }

@ObjectType()
class UserResponse {
	@Field(() => FieldError, { nullable: true })
	error?: FieldError;

	@Field(() => User, { nullable: true })
	user?: User;
}

@Resolver(User)
export class UserResolver {
	@FieldResolver()
	email(@Root() user: User, @Ctx() { req }: MyContext) {
		if (req.session.userId === user.id) return user.email;
		else return "";
	}

	@Query(() => User, { nullable: true })
	async me(@Ctx() { req }: MyContext) {
		if (!req.session.userId) {
			return null;
		}

		const user = await User.findOne({ id: req.session.userId });
		return user;
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("username") username: string,
		@Arg("password") password: string,
		@Arg("email") email: string,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		if (username.length < 5)
			return {
				error: {
					field: "username",
					message: "length must be greater than 4",
				},
			};

		if (!isValidPassword(password))
			return {
				error: {
					field: "password",
					message:
						"must contain at least one letter, at least one number, and be longer than six charaters",
				},
			};

		if (!isEmail(email))
			return {
				error: {
					field: "email",
					message: "please provide a valid email",
				},
			};

		const usernameAlreadyExists = await User.findOne(
			{
				username: username.toLowerCase(),
			},
			{ select: ["id"] }
		);

		if (usernameAlreadyExists)
			return {
				error: {
					field: "username",
					message: "user already exists",
				},
			};

		const emailAlreadyExists = await User.findOne(
			{ email },
			{ select: ["id"] }
		);
		if (emailAlreadyExists)
			return {
				error: {
					field: "email",
					message: "email already has an account",
				},
			};

		const hashedPassword = await argon2.hash(password);

		const user = await User.create({
			username: username.toLowerCase(),
			email,
			password: hashedPassword,
		}).save();

		req.session.userId = user.id;

		return {
			user,
		};
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("username") username: string,
		@Arg("password") password: string,
		@Ctx() { req }: MyContext
	): Promise<UserResponse | undefined> {
		const user = await User.findOne({
			username: username.toLowerCase(),
		});

		if (!user)
			return {
				error: {
					field: "username",
					message: "user doesn't exist",
				},
			};

		const valid = await argon2.verify(user.password, password);

		if (!valid)
			return {
				error: {
					field: "password",
					message: "incorrect password",
				},
			};

		req.session.userId = user.id;

		return {
			user,
		};
	}

	@Mutation(() => Boolean)
	async logout(@Ctx() { req, res }: MyContext) {
		return new Promise(resolve =>
			req.session.destroy(err => {
				res.clearCookie(COOKIE_NAME);
				if (err) {
					console.log(err);
					resolve(false);
					return;
				}

				resolve(true);
			})
		);
	}

	@Mutation(() => Boolean)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { redis }: MyContext
	) {
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return true;
		}

		const token = v4();

		await redis.set(
			FORGOT_PASSWORD_PREFIX + token,
			user.id.toString(),
			"EX",
			1000 * 60 * 60 * 24
		);

		await sendMailWithTemplate(
			{
				to: email,
				subject: "Reset password",
			},
			"forgotPassword",
			{
				link: `${process.env.CORS}/change-password?token=${token}`,
			}
		);

		return true;
	}

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg("token") token: string,
		@Arg("newPassword") newPassword: string,
		@Ctx() { redis, req }: MyContext
	): Promise<UserResponse> {
		if (
			!newPassword.match(
				/^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,}$/
			)
		)
			return {
				error: {
					field: "newPassword",
					message:
						"must contain at least one letter, at least one number, and be longer than six charaters",
				},
			};

		const key = FORGOT_PASSWORD_PREFIX + token;
		let userId: string | null | undefined;
		await new Promise(resolve => {
			redis.get(key, (_, value) => {
				userId = value;
				resolve(true);
			});
		});

		if (!userId)
			return {
				error: {
					field: "token",
					message: "token expired",
				},
			};

		const userIdNum = parseInt(userId);
		const user = await User.findOne(userIdNum);

		if (!user)
			return {
				error: {
					field: "token",
					message: "user no longer exists",
				},
			};

		await User.update(
			{ id: userIdNum },
			{ password: await argon2.hash(newPassword) }
		);

		await redis.del(key);

		req.session.userId = user.id;

		return { user };
	}
}
