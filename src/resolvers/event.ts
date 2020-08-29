import {
  Resolver,
  Mutation,
  Arg,
  Query,
  Int,
  Ctx,
  Authorized,
} from "type-graphql";
import { Event } from "../entities/Event";
import { MyContext } from "src/types";

@Resolver()
export class EventResolver {
  @Mutation(() => Event)
  @Authorized()
  async createEvent(
    @Arg("title") title: string,
    @Arg("description") description: string,
    @Ctx() { req }: MyContext
  ): Promise<Event> {
    return Event.create({
      title,
      description,
      creatorId: req.session.userId,
    }).save();
  }

  @Query(() => [Event])
  events(): Promise<Event[]> {
    return Event.find({ relations: ["creator"] });
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
    @Arg("description", () => String, { nullable: true }) description: string,
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

  @Mutation(() => Boolean, { nullable: true })
  async deleteEvent(@Arg("id") id: number, @Ctx() { req }: MyContext) {
    const event = await Event.findOne({
      where: { id },
      relations: ["creator"],
    });

    if (!event || req.session.userId !== event.creatorId) return false;

    await event.remove();
    return true;
  }
}
