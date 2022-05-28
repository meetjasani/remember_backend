import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { memorialHall } from ".";
import { LoginWith, RoleType, UserType } from "../../utils/constant";

@Entity("user")
export default class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true, default: null })
  avatar: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  mobile: string;

  @Column({
    type: "date",
    default: null,
  })
  dob: Date;

  @Column({
    type: "enum",
    enum: UserType,
    default: UserType.Non,
  })
  user_type: UserType;

  @Column({
    default: false,
  })
  is_verified: boolean;

  @Column({
    default: false,
  })
  is_deleted: boolean;

  @Column({
    type: "timestamp",
    default: null,
  })
  deleted_at: Date;

  @Column({
    type: "enum",
    enum: RoleType,
    default: null,
  })
  deleted_by: RoleType;

  @CreateDateColumn({
    type: "timestamp",
  })
  created_at: Date;

  @UpdateDateColumn({
    type: "timestamp",
  })
  updated_at: Date;

  @Column({
    type: "enum",
    enum: LoginWith,
    default: LoginWith.Manual,
  })
  login_with: LoginWith;

  @OneToMany(() => memorialHall, (memorialHall) => memorialHall.user)
  memorialHall: memorialHall[];

}
