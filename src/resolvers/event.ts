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
	Float,
} from "type-graphql";
import { Event } from "../entities/Event";
import { MyContext } from "../types";
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
		@Arg("startDate", () => Float) startDate: number,
		@Arg("endDate", () => Float, { nullable: true })
		endDate: number | null,
		@Ctx() { req }: MyContext
	): Promise<EventResponse> {
		if (Number.isNaN(startDate))
			return {
				error: {
					field: "startDate",
					message: "please enter a valid date",
				},
			};

		if (endDate && Number.isNaN(endDate))
			return {
				error: {
					field: "endDate",
					message: "please enter a valid date",
				},
			};

		if (startDate < Date.now())
			return {
				error: {
					field: "startDate",
					message: "choose another date that has not passed yet",
				},
			};

		if (endDate && startDate >= endDate)
			return {
				error: {
					field: "endDate",
					message: "end date should be later than the startdate",
				},
			};

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
			startDate: new Date(startDate),
			endDate: endDate ? new Date(endDate) : null!,
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
	async eventById(@Arg("id", () => Int) id: number): Promise<Event | undefined> {
		const event = await Event.findOne({ where: { id }, relations: ["creator"] });
		console.log(event);
		return event;
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
		@Arg("startDate", () => Float, { nullable: true })
		startDate: number | null,
		@Arg("useEndDate", () => Boolean, { nullable: true })
		useEndDate: boolean,
		@Arg("endDate", () => Float, { nullable: true }) endDate: number | null,
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
		event.maxReservations = maxReservations;
		if (startDate) event.startDate = new Date(startDate);
		if (useEndDate && endDate) event.endDate = new Date(endDate);
		else if (!useEndDate) event.endDate = null;

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
			where: { id },
		});

		if (!event || req.session.userId !== event.creatorId) return false;

		await Reservation.delete({ event });
		await event.remove();
		return true;
	}
}
