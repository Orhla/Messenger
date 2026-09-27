alter table profiles add column public_key text;

alter table messages rename column text to ciphertext;
alter table messages add column iv text not null default '';