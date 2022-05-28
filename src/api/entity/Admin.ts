import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("admin")
export default class Admin {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  avatar: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  failed_count: number;
}
