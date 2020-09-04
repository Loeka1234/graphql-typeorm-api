export const isEmail = (email: string) => {
	var re = /\S+@\S+\.\S+/;
	return re.test(email);
};
