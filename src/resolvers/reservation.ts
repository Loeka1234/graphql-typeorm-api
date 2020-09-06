import {
	Resolver,
	Mutation,
	Arg,
	Int,
	ObjectType,
	Field,
	Query,
	Ctx,
	Authorized,
	Float,
} from "type-graphql";
import { isEmail } from "class-validator";
import { Reservation } from "../entities/Reservation";
import { sendMailWithTemplate } from "../mail";
import { FieldError } from "../utils/FieldError";
import { Event } from "../entities/Event";
import { getConnection } from "typeorm";
import { MyContext } from "../types";

@ObjectType()
class ReserveResponse {
	@Field(() => String, { nullable: true })
	error?: string;

	@Field(() => FieldError, { nullable: true })
	fieldError?: FieldError;

	@Field(() => Boolean)
	success: boolean;
}

@ObjectType()
class PaginatedReservationsResponse {
	@Field(() => [Reservation])
	reservations: Reservation[];

	@Field(() => Boolean)
	hasMore: boolean;
}

@Resolver()
export class ReservationResolver {
	@Mutation(() => ReserveResponse)
	async reserve(
		@Arg("email") email: string,
		@Arg("name") name: string,
		@Arg("eventId", () => Int) eventId: number
	): Promise<ReserveResponse> {
		if (!name)
			return {
				fieldError: {
					field: "name",
					message: "please provide your name",
				},
				success: false,
			};
		if (!email)
			return {
				fieldError: {
					field: "email",
					message: "please provide your email",
				},
				success: false,
			};

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

		if (!isEmail(email))
			return {
				fieldError: {
					field: "email",
					message: "please enter a valid email",
				},
				success: false,
			};

		event.amountReservations += 1;

		await event.save();
		await Reservation.create({
			email,
			eventId,
			name,
		}).save();

		sendMailWithTemplate(
			{ to: email, subject: "Reserved event" },
			"reserveEvent",
			{
				event: event.title,
				eventLink: `${process.env.CORS}/events/${event.id}`,
			}
		);

		return {
			success: true,
		};
	}

	@Query(() => PaginatedReservationsResponse)
	@Authorized()
	async paginatedReservations(
		@Arg("limit", () => Int) limit: number,
		@Arg("cursor", () => Float, { nullable: true }) cursor: number | null,
		@Ctx() { req }: MyContext
	): Promise<PaginatedReservationsResponse> {
		const realLimit = Math.min(50, limit);
		const realLimitPlusOne = realLimit + 1;

		let reserv = getConnection()
			.getRepository(Reservation)
			.createQueryBuilder("reservation")
			.leftJoinAndSelect("reservation.event", "event")
			.where('event."creatorId" = :id', {
				id: req.session.userId,
			})
			.orderBy('reservation."createdAt"', "DESC")
			.limit(realLimitPlusOne);

		if (cursor) {
			reserv = reserv.where('reservation."createdAt" < :cursor', {
				cursor: new Date(cursor),
			});
		}

		const reservations = await reserv.getMany();

		return {
			reservations: reservations.slice(0, realLimit),
			hasMore: reservations.length === realLimitPlusOne,
		};
	}
}
