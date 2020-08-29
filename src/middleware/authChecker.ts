import { MyContext } from "src/types";
import { AuthChecker } from "type-graphql";

export const authChecker: AuthChecker<MyContext> = ({ context }) => {
  if(!context.req.session.userId) return false;
  return true;
}