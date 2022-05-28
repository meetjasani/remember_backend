import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("country")
export default class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  name_ko: string;

  @Column()
  code: string;
}
