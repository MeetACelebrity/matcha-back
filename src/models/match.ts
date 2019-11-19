import { ModelArgs } from './index';
import { Gender, Tags } from './user';

export interface ProposalArgs extends ModelArgs {
    uuid: string;
}

export async function proposals({ db, uuid }: ProposalArgs) {}
