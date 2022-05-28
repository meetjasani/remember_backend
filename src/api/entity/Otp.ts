import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("otp")
export default class OTP {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mobile: string;

  @Column()
  code: number;
}
