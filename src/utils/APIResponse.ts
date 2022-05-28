import httpStatus from "http-status";
/**
 * Class representing an API Resonse.
 */
export default class APIResponse {
  private readonly data: Object;
  private readonly message: string;
  private readonly status: number;
  private readonly error: Object;

  constructor(
    data: Object = null,
    message: string = "",
    status: number = 200,
    error: Object = null
  ) {
    if (data) {
      this.data = data;
    }

    if (message) {
      this.message = message;
    }

    if (status) {
      this.status = status;
    }

    if (error) {
      this.error = error;
    }
  }
}
