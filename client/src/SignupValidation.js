function validation(values) {
  //   alert("Validating");
  let errors = {};
  const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const password_pattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

  if (values.idnumber === "") {
    errors.idnumber = "ID Number is required";
  } else {
    errors.idnumber = "";
  }

  if (values.Email === "") {
    errors.Email = "Email is required";
  } else if (!email_pattern.test(values.Email)) {
    errors.Email = "Email is not valid";
  } else {
    errors.Email = "";
  }
  if (values.password === "") {
    errors.password = "Password is required";
  } else if (!password_pattern.test(values.password)) {
    errors.password = "Password is not valid";
  } else {
    errors.password = "";
  }
  return errors;
}
export default validation;
