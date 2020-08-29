import {
  Resolver,
  Query,
  Mutation,
  InputType,
  Field,
  Arg,
  ObjectType,
} from "type-graphql";
import { User } from "../entities/User";
import argon2 from "argon2";

@InputType()
class RegisterInput {
  @Field()
  username: string;

  @Field()
  password: string;

  @Field()
  email: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => FieldError, { nullable: true })
  error?: FieldError;

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("username") username: string,
    @Arg("password") password: string,
    @Arg("email") email: string
  ): Promise<UserResponse> {
    if (username.length < 5)
      return {
        error: {
          field: "username",
          message: "length must be greater than 4",
        },
      };

    if (!password.match(/^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,}$/))
      return {
        error: {
          field: "password",
          message:
            "must contain at least one letter, at least one number, and be longer than six charaters",
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

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("username") username: string,
    @Arg("password") password: string
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

    return {
      user,
    };
  }
}
