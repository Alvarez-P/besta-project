const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_LENGTH = 255;

export class UserEmail {
  private constructor(private readonly value: string) {}

  static create(email: string): UserEmail {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || trimmed.length > MAX_LENGTH) {
      throw new Error(`Email must be between 1 and ${MAX_LENGTH} characters`);
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error('Invalid email format');
    }

    return new UserEmail(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserEmail): boolean {
    return this.value === other.value;
  }
}
