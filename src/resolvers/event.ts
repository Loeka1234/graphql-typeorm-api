import {
	Resolver,
	Mutation,
	Arg,
	Query,
	Int,
	Ctx,
	Authorized,
	ObjectType,
	Field,
} from "type-graphql";
import { Event } from "../entities/Event";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import { FieldError } from "../utils/FieldError";

@ObjectType()
class EventResponse {
	@Field(() => FieldError, { nullable: true })
	error?: FieldError;

	@Field(() => Event, { nullable: true })
	event?: Event;
}

@Resolver()
export class EventResolver {
	@Mutation(() => EventResponse)
	@Authorized()
	async createEvent(
		@Arg("title") title: string,
		@Arg("description", () => String, { nullable: true })
		description: string,
		@Ctx() { req }: MyContext
	): Promise<EventResponse> {
		if (!title || title.length < 5)
			return {
				error: {
					field: "title",
					message: "title should have a minimul length of 4",
				},
			};

		const event = await Event.create({
			title,
			description,
			creatorId: req.session.userId,
		}).save();

		return {
			event,
		};
	}

	@Query(() => [Event])
	@Authorized()
	async events(@Ctx() { req }: MyContext): Promise<Event[]> {
		const user = await User.findOne({ id: req.session.userId });

		return Event.find({
			where: { creatorId: user?.id },
		});
	}

	@Query(() => Event, { nullable: true })
	eventById(@Arg("id", () => Int) id: number): Promise<Event | undefined> {
		return Event.findOne({ where: { id }, relations: ["creator"] });
	}

	@Mutation(() => Event, { nullable: true })
	@Authorized()
	async updateEvent(
		@Arg("id", () => Int) id: number,
		@Arg("title", () => String, { nullable: true }) title: string,
		@Arg("description", () => String, { nullable: true })
		description: string,
		@Ctx() { req }: MyContext
	) {
		const event = await Event.findOne({
			id,
		});
		if (!event || (!title && !description)) return null;

		if (req.session.userId !== event.creatorId) return null;

		if (title) event.title = title;
		if (description) event.description = description;

		const updatedEvent = await event.save();
		return updatedEvent;
	}

	@Mutation(() => Boolean)
	@Authorized()
	async deleteEvent(@Arg("id", () => Int) id: number, @Ctx() { req }: MyContext) {
		const event = await Event.findOne({
			id,
		});

		if (!event || req.session.userId !== event.creatorId) return false;

		await event.remove();
		return true;
	}
}
