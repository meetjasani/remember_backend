import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { RelationShip } from "../../utils/constant";
import memorialHall from "./memorialHall";

@Entity("invite_family_members")
export default class InviteFamilyMembers {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column({
        type: "enum",
        enum: RelationShip,
        default: null,
    })
    relationship: RelationShip;

    @OneToOne(() => memorialHall, (memorialhall) => memorialhall.registerer, {
        onDelete: "CASCADE",
        nullable: false,
    })
    @JoinColumn({ name: "memorial_id" })
    memorialHall: memorialHall;
}
