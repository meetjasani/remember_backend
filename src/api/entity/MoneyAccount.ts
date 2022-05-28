import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import memorialHall from "./memorialHall";

@Entity("money_account")
export default class MoneyAccount {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column()
    bank_name: string;

    @Column()
    ac_number: string;

    @OneToOne(() => memorialHall, (memorialhall) => memorialhall.registerer, {
        onDelete: "CASCADE",
        nullable: false,
    })
    @JoinColumn({ name: "memorial_id" })
    memorialHall: memorialHall;
}
