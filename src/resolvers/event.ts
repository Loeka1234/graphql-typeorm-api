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
import { Reservation } from "../entities/Reservation";

@ObjectType()
class EventResponse {
	@Field(() => FieldError, { nullable: true })
	error?: FieldError;

	@Field(() => Event, { nullable: true })
	event?: Event;
}

@ObjectType()
class ReserveResponse {
	@Field(() => String, { nullable: true })
	error?: string;

	@Field(() => Boolean)
	success: boolean;
}

@Resolver()
export class EventResolver {
	@Mutation(() => EventResponse)
	@Authorized()
	async createEvent(
		@Arg("title") title: string,
		@Arg("description", () => String, { nullable: true })
		description: string,
		@Arg("maxReservations", () => Int, { nullable: true })
		maxReservations: number | undefined,
		@Ctx() { req }: MyContext
	): Promise<EventResponse> {
		if (!title || title.length < 5)
			return {
				error: {
					field: "title",
					message: "title should have a minimul length of 5",
				},
			};

		const event = await Event.create({
			title,
			description,
			creatorId: req.session.userId,
			maxReservations: maxReservations,
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
			relations: ["reservations"],
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
		@Arg("title", () => String, { nullable: true }) title: string | null,
		@Arg("description", () => String, { nullable: true })
		description: string | null,
		@Arg("maxReservations", () => Int, { nullable: true })
		maxReservations: number | null,
		@Ctx() { req }: MyContext
	) {
		const event = await Event.findOne({
			id,
		});
		if (
			!event ||
			(!title && !description && typeof maxReservations === "undefined")
		)
			return null;

		if (req.session.userId !== event.creatorId) return null;

		if (title) event.title = title;
		if (description) event.description = description;
		if (maxReservations) event.maxReservations = maxReservations;

		const updatedEvent = await event.save();
		return updatedEvent;
	}

	@Mutation(() => Boolean)
	@Authorized()
	async deleteEvent(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: MyContext
	) {
		const event = await Event.findOne({
			where: { id }
		});

		if (!event || req.session.userId !== event.creatorId) return false;

		await Reservation.delete({ event });
		await event.remove();
		return true;
	}

	@Mutation(() => ReserveResponse)
	async reserve(
		@Arg("email") email: string,
		@Arg("eventId", () => Int) eventId: number
	): Promise<ReserveResponse> {
		// TODO: validate email
		const event = await Event.findOne({ id: eventId });
		if (!event)
			return {
				error: "event does not exist",
				success: false,
			};
		if (event.maxReservations === event.amountReservations)
			return {
				error:
					"this event has reached the maximum amount of reservations",
				success: false,
			};

		event.amountReservations += 1;

		await event.save();
		await Reservation.create({
			email,
			eventId,
		}).save();

		return {
			success: true,
		};
	}
}
