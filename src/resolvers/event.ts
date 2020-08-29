import { Resolver, Mutation, Arg, Query, Int } from "type-graphql";
import { Event } from "../entities/Event";

@Resolver()
export class EventResolver {
  @Mutation(() => Event)
  async createEvent(
    @Arg("title") title: string,
    @Arg("description") description: string
  ): Promise<Event> {
    return Event.create({
      title,
      description,
    }).save();
  }

  @Query(() => [Event])
  events(): Promise<Event[]> {
    return Event.find({});
  }

  @Query(() => Event, { nullable: true })
  eventById(@Arg("id", () => Int) id: number): Promise<Event | undefined> {
    return Event.findOne({ id });
  }

  @Mutation(() => Event, { nullable: true })
  async updateEvent(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: true }) title: string,
    @Arg("description", () => String, { nullable: true }) description: string
  ) {
    const event = await Event.findOne({ id });
    if (!event || (!title && !description)) return null;

    if (title) event.title = title;
    if (description) event.description = description;

    const updatedEvent = await event.save();
    return updatedEvent;
  }

  @Mutation(() => Boolean)
  async deleteEvent(
    @Arg("id") id: number
  ) {
    const { affected } = await Event.delete({ id });
    if (affected === 0) return false;
    else return true;
  }
}
