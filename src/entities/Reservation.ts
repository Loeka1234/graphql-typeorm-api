import {
	BaseEntity,
	Entity,
	PrimaryGeneratedColumn,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	Column,
} from "typeorm";
import { Event } from "./Event";
import { Field, ObjectType, Int, Float } from "type-graphql";

@ObjectType()
@Entity()
export class Reservation extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id: number;

	@Field()
	@Column()
	email: string;

	@Field()
	@Column()
	name: string;

	@Field(() => Int)
	@Column()
	eventId: number;

	@ManyToOne(() => Event, event => event.reservations)
	event: Event;

	@Field(() => Float)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => Float)
	@UpdateDateColumn()
	updatedAt: Date;
}
