import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PersonRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeName } from '../common/normalize.js';
import { toTrackView, trackInclude, type TrackView } from '../tracks/track.view.js';
import { CreatePersonDto, RenamePersonDto } from './people.dto.js';

const ROLES: PersonRole[] = ['composer', 'artist', 'lyricist', 'actor'];

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  // With a role and limit, returns the people with the most tracks in that role.
  async list(role?: PersonRole, limit?: number, includeArchived = false) {
    if (role && limit) return this.topByRole(role, limit, includeArchived);
    return this.prisma.person.findMany({
      where: role ? { roles: { some: { role } } } : undefined,
      select: { id: true, name: true },
      orderBy: { normalizedName: 'asc' },
    });
  }

  private async topByRole(role: PersonRole, limit: number, includeArchived: boolean) {
    const counts = await this.prisma.trackPerson.groupBy({
      by: ['personId'],
      where: { role, ...(includeArchived ? {} : { track: { archived: false } }) },
      _count: { _all: true },
      orderBy: { _count: { personId: 'desc' } },
      take: limit,
    });
    const people = await this.prisma.person.findMany({
      where: { id: { in: counts.map((row) => row.personId) } },
      select: { id: true, name: true },
    });
    const byId = new Map(people.map((person) => [person.id, person]));
    return counts.map((row) => ({ ...byId.get(row.personId)!, trackCount: row._count._all }));
  }

  // Reuses an existing person with the same name and adds the requested role to them.
  async create(input: CreatePersonDto) {
    const normalizedName = normalizeName(input.name);
    const person = await this.prisma.person.upsert({
      where: { normalizedName },
      create: { name: input.name, normalizedName },
      update: {},
      select: { id: true, name: true },
    });
    await this.prisma.personRoleLink.upsert({
      where: { personId_role: { personId: person.id, role: input.role } },
      create: { personId: person.id, role: input.role },
      update: {},
    });
    return person;
  }

  // Renames the person everywhere they appear. Fails if another person already has the name.
  async rename(id: number, input: RenamePersonDto) {
    const person = await this.prisma.person.findUnique({ where: { id }, select: { id: true } });
    if (!person) throw new NotFoundException('Person not found');

    const normalizedName = normalizeName(input.name);
    const clash = await this.prisma.person.findUnique({ where: { normalizedName }, select: { id: true } });
    if (clash && clash.id !== id) throw new ConflictException('Another person already has this name');

    return this.prisma.person.update({
      where: { id },
      data: { name: input.name, normalizedName },
      select: { id: true, name: true },
    });
  }

  // Deletes the person and their role links. Refuses while any track (archived included) still references them.
  async remove(id: number) {
    const person = await this.prisma.person.findUnique({ where: { id }, select: { id: true } });
    if (!person) throw new NotFoundException('Person not found');

    const linkedTracks = await this.prisma.trackPerson.count({ where: { personId: id } });
    if (linkedTracks > 0) throw new ConflictException('Person still has tracks');

    await this.prisma.person.delete({ where: { id } });
  }

  // Groups the person's tracks by role; a track can appear under several roles.
  async detail(id: number, includeArchived = false) {
    const person = await this.prisma.person.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!person) throw new NotFoundException('Person not found');

    const rows = await this.prisma.track.findMany({
      where: { people: { some: { personId: id } }, ...(includeArchived ? {} : { archived: false }) },
      include: trackInclude,
      orderBy: { normalizedTrackName: 'asc' },
    });
    const groups = Object.fromEntries(ROLES.map((role) => [role, [] as TrackView[]])) as Record<PersonRole, TrackView[]>;
    for (const row of rows) {
      const view = toTrackView(row);
      for (const role of ROLES) {
        if (row.people.some((link) => link.personId === id && link.role === role)) {
          groups[role].push(view);
        }
      }
    }
    return { ...person, groups };
  }
}
