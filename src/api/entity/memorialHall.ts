import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, Timestamp, UpdateDateColumn } from "typeorm";
import { User } from ".";
import { RoleType } from "../../utils/constant";
import DonationSerives from "./DonationSerives";
import InviteFamilyMembers from "./InviteFamilyMembers";
import MoneyAccount from "./MoneyAccount";
import Registerer from "./Registerer";

@Entity("memorial_hall")
export default class memorialHall {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column()
    age: number;

    @Column()
    job_title: string;

    @Column({
        type: "timestamp",
        default: null,
    })
    date_of_death: Date;

    @Column({
        type: "timestamp",
        default: null,
    })
    date_of_carrying_the_coffin_out: Date;

    @Column()
    funeral_Address: string;

    @Column()
    room_number: number;

    @Column()
    burial_plot: string;

    @Column({ nullable: true, default: null })
    image: string;

    @Column()
    Introduction: string;

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

    @ManyToOne(() => User, (user) => user.memorialHall, {
        nullable: true,
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "created_by" })
    user: User;

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
        enum: RoleType,
        default: RoleType.user,
    })
    creator: RoleType;

    @OneToMany(() => Registerer, (registerer) => registerer.memorialHall)
    registerer: Registerer[];

    @OneToMany(() => InviteFamilyMembers, (inviteFamilyMembers) => inviteFamilyMembers.memorialHall)
    inviteFamilyMembers: InviteFamilyMembers[];

    @OneToMany(() => MoneyAccount, (moneyAccount) => moneyAccount.memorialHall)
    moneyAccount: MoneyAccount[];

    @OneToMany(() => DonationSerives, (donationSerives) => donationSerives.memorialHall)
    donationSerives: DonationSerives[];

}
