import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ServiceDuration } from "../../utils/constant";
import memorialHall from "./memorialHall";

@Entity("donation_serives")
export default class DonationSerives {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    donation_field: string;

    @Column({
        default: null
    })
    donation_field_ko: string;

    @Column()
    bank_name: string;

    @Column()
    recipient_organization: string;

    @Column()
    ac_number: string;

    @Column()
    Introduction: string;

    @Column({
        type: "enum",
        enum: ServiceDuration,
        default: null,
    })
    service_duration: ServiceDuration;

    @OneToOne(() => memorialHall, (memorialhall) => memorialhall.registerer, {
        onDelete: "CASCADE",
        nullable: false,
    })
    @JoinColumn({ name: "memorial_id" })
    memorialHall: memorialHall;
}
