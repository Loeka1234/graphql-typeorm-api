import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
	ManyToOne,
	OneToMany,
} from "typeorm";
import { ObjectType, Field, Int, Float } from "type-graphql";
import { User } from "./User";
import { Reservation } from "./Reservation";

@ObjectType()
@Entity()
export class Event extends BaseEntity {
	@Field(() => Int, { nullable: true })
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	title: string;

	@Field(() => String, { nullable: true })
	@Column("text", { nullable: true })
	description: string | null;

	@Field(() => Int)
	@Column("int", { default: 0 })
	amountReservations: number;

	@Field(() => Int, { nullable: true })
	@Column("int", { nullable: true })
	maxReservations: number | null;

	@Field(() => [Reservation])
	@OneToMany(() => Reservation, reservation => reservation.event)
	reservations: Reservation[];

	@Field(() => Float)
	@Column("timestamp with time zone")
	startDate: Date;

	@Field(() => Float, { nullable: true })
	@Column("timestamp with time zone", { nullable: true })
	endDate: Date |null;

	@Field()
	@Column()
	creatorId: number;

	@Field(() => User)
	@ManyToOne(() => User, user => user.events)
	creator: User;
}
